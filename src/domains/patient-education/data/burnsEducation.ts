/**
 * Burns and Burn-Related Conditions Educational Content
 * Category A - Patient Education Module
 * CareBridge Innovations in Healthcare
 * 
 * Based on WHO Guidelines for Burn Care
 */

import type { EducationCondition } from '../types';

export const burnsEducationContent: EducationCondition[] = [
  // A1. Thermal Burns (Scalds)
  {
    id: 'burns-thermal-scalds',
    categoryId: 'A',
    name: 'Thermal Burns - Scalds (Hot Water/Food Burns)',
    alternateNames: ['Hot water burns', 'Steam burns', 'Hot liquid burns'],
    icdCode: 'T20-T25',
    
    overview: {
      definition: 'Scald burns are thermal injuries caused by hot liquids such as boiling water, hot beverages, cooking oil, or steam. These are the most common type of burn injury, particularly affecting children under 5 years of age. Scalds typically cause partial-thickness burns but can progress to full-thickness injuries with prolonged exposure or extremely hot liquids.',
      causes: [
        'Spilling hot drinks (tea, coffee, soup)',
        'Hot bath water (temperature above 49°C/120°F)',
        'Boiling water from cooking',
        'Hot cooking oil splashes',
        'Steam from kettles, pots, or pressure cookers',
        'Hot food spillage'
      ],
      riskFactors: [
        'Age: Children under 5 and elderly over 65',
        'Inadequate supervision of young children',
        'Unsafe water heating practices',
        'Epilepsy or conditions causing loss of consciousness',
        'Sensory impairment (diabetes, neuropathy)',
        'Alcohol or drug intoxication',
        'Unsafe cooking practices'
      ],
      symptoms: [
        'Immediate severe pain at the burn site',
        'Redness and swelling of affected area',
        'Blistering (indicates second-degree burn)',
        'Skin peeling or sloughing',
        'Weeping or oozing from wound',
        'White or waxy appearance (deep burns)',
        'Pain may be absent in deep burns (nerve damage)'
      ],
      diagnosis: [
        'Clinical assessment of burn depth',
        'Measurement of Total Body Surface Area (TBSA) using Rule of Nines or Lund-Browder chart',
        'Assessment of burn location and special areas (face, hands, feet, genitals, joints)',
        'Evaluation of associated injuries',
        'Baseline blood tests for major burns (FBC, U&E, glucose)',
        'Assessment of inhalation injury if applicable'
      ],
      classification: [
        {
          name: 'Burn Depth Classification',
          description: 'Burns are classified by depth of tissue injury',
          grades: [
            {
              grade: 'Superficial (1st Degree)',
              description: 'Epidermis only',
              characteristics: ['Red, dry skin', 'Painful', 'No blisters', 'Heals in 3-7 days without scarring']
            },
            {
              grade: 'Partial Thickness - Superficial (2nd Degree)',
              description: 'Epidermis and upper dermis',
              characteristics: ['Blisters present', 'Pink/red, moist', 'Very painful', 'Heals in 7-21 days', 'Minimal scarring']
            },
            {
              grade: 'Partial Thickness - Deep (2nd Degree)',
              description: 'Epidermis and deep dermis',
              characteristics: ['Blisters may be broken', 'Pale, mottled appearance', 'Less painful', 'Takes 3+ weeks to heal', 'Scarring likely']
            },
            {
              grade: 'Full Thickness (3rd Degree)',
              description: 'All layers of skin destroyed',
              characteristics: ['White, brown, or black', 'Leathery texture', 'Painless (nerve destruction)', 'Requires skin grafting', 'Significant scarring']
            }
          ]
        }
      ],
      epidemiology: 'Scalds account for 30-40% of all burn admissions. In children under 5, scalds represent over 65% of burn injuries. WHO estimates 180,000 burn-related deaths annually worldwide.',
      prognosis: 'Most scald burns are superficial or superficial partial thickness and heal within 2-3 weeks with proper care. Deep partial and full thickness burns require surgical intervention. Overall survival depends on TBSA, age, and presence of inhalation injury.'
    },
    
    treatmentPhases: [
      {
        phase: 1,
        name: 'Emergency Phase (0-72 hours)',
        duration: '0-72 hours',
        description: 'Immediate life-saving measures, pain control, and fluid resuscitation for burns >15% TBSA in adults or >10% in children.',
        goals: [
          'Stop the burning process',
          'Maintain airway and breathing',
          'Establish IV access for major burns',
          'Initiate fluid resuscitation (Parkland formula)',
          'Control pain',
          'Prevent hypothermia',
          'Tetanus prophylaxis'
        ],
        interventions: [
          'Cool burn with running water (20°C) for 20 minutes within 3 hours of injury',
          'Remove clothing and jewelry from burned area',
          'Cover with clean, non-adherent dressing',
          'IV fluid resuscitation: 4ml × weight(kg) × %TBSA in first 24 hours',
          'IV morphine for pain control',
          'Urinary catheter for burns >20% TBSA',
          'Nasogastric tube for burns >25% TBSA'
        ],
        milestones: [
          'Adequate urine output (0.5-1ml/kg/hour in adults)',
          'Pain controlled',
          'Stable vital signs',
          'Accurate burn assessment completed'
        ],
        nursingCare: [
          'Hourly urine output monitoring',
          'Vital signs every 15-30 minutes initially',
          'Fluid input/output charting',
          'Pain assessment using appropriate scale',
          'Temperature monitoring (prevent hypothermia)',
          'Wound observation for progression'
        ]
      },
      {
        phase: 2,
        name: 'Acute Phase (3-14 days)',
        duration: '3-14 days',
        description: 'Wound care, infection prevention, nutritional support, and preparation for surgery if needed.',
        goals: [
          'Prevent wound infection',
          'Optimize wound healing environment',
          'Maintain nutritional status',
          'Plan surgical intervention if required',
          'Begin rehabilitation'
        ],
        interventions: [
          'Regular wound cleansing and dressing changes',
          'Topical antimicrobial agents (silver sulfadiazine, silver-containing dressings)',
          'High-protein, high-calorie diet',
          'Early enteral feeding for major burns',
          'Physical therapy to prevent contractures',
          'Surgical debridement of necrotic tissue',
          'Skin grafting for full-thickness burns'
        ],
        milestones: [
          'No signs of wound infection',
          'Wound bed clean and granulating',
          'Maintaining nutritional goals',
          'Range of motion preserved'
        ],
        nursingCare: [
          'Aseptic wound care technique',
          'Daily wound assessment and documentation',
          'Nutritional intake monitoring',
          'Positioning to prevent contractures',
          'Psychological support'
        ]
      },
      {
        phase: 3,
        name: 'Rehabilitation Phase (2 weeks - 2 years)',
        duration: '2 weeks to 2 years',
        description: 'Scar management, functional restoration, and psychological support.',
        goals: [
          'Achieve wound closure',
          'Minimize scarring and contractures',
          'Restore function',
          'Address psychological needs',
          'Reintegrate into daily activities'
        ],
        interventions: [
          'Pressure garment therapy for 12-24 months',
          'Silicone gel sheeting for scar management',
          'Intensive physiotherapy and occupational therapy',
          'Splinting for contracture prevention',
          'Reconstructive surgery as needed',
          'Psychological counseling',
          'Vocational rehabilitation'
        ],
        milestones: [
          'Complete wound healing',
          'Functional range of motion',
          'Scar maturation',
          'Return to work/school',
          'Psychological adjustment'
        ]
      }
    ],
    
    preoperativeInstructions: {
      consultations: [
        'Plastic surgery consultation for burn assessment',
        'Anesthesia evaluation for major burns',
        'Nutritional assessment for malnourished patients',
        'Psychological support assessment'
      ],
      investigations: [
        'Full blood count and group/crossmatch',
        'Urea, creatinine, and electrolytes',
        'Blood glucose',
        'Chest X-ray if inhalation injury suspected',
        'Wound swab for culture if infection suspected'
      ],
      medications: [
        { medication: 'Aspirin/NSAIDs', instruction: 'stop', timing: '7 days before surgery', reason: 'Increased bleeding risk' },
        { medication: 'Warfarin', instruction: 'stop', timing: 'As directed by physician', reason: 'Bleeding risk - may need bridging' },
        { medication: 'Regular medications', instruction: 'continue', timing: 'As usual unless directed otherwise', reason: 'Maintain medical stability' },
        { medication: 'Antihypertensives', instruction: 'continue', timing: 'Morning of surgery with sip of water', reason: 'Prevent perioperative hypertension' }
      ],
      dietaryRestrictions: [
        'Nothing by mouth (nil per os) for 6 hours before surgery',
        'Clear fluids may be taken up to 2 hours before surgery',
        'No alcohol for 24 hours before surgery'
      ],
      physicalPreparation: [
        'Shower or bath the evening before surgery',
        'Wash the burn area gently if advised',
        'Remove nail polish and jewelry',
        'Wear loose, comfortable clothing'
      ],
      psychologicalPreparation: [
        'Discuss procedure details and expected outcomes with surgical team',
        'Understand the need for potential multiple surgeries',
        'Address fears and concerns',
        'Arrange support for post-operative period'
      ],
      consentRequirements: [
        'Informed consent for skin grafting procedure',
        'Consent for blood transfusion if required',
        'Photography consent for documentation',
        'Understanding of risks including graft failure, infection, scarring'
      ],
      dayBeforeSurgery: [
        'Light dinner, no heavy meals',
        'Take prescribed medications as directed',
        'Prepare items needed for hospital stay',
        'Arrange transportation home after discharge'
      ],
      dayOfSurgery: [
        'Remain nil by mouth as instructed',
        'Take essential medications with small sip of water',
        'Arrive at hospital at scheduled time',
        'Bring list of current medications'
      ]
    },
    
    intraoperativeInfo: {
      anesthesiaType: ['General anesthesia for extensive burns', 'Regional anesthesia for limited burns', 'Sedation with local anesthesia for small areas'],
      procedureDescription: 'Skin grafting involves removing damaged tissue (eschar) and covering the wound with healthy skin. Split-thickness skin grafts (STSG) are most commonly used, harvested from unburned areas (donor sites) using a dermatome. The graft is then secured to the prepared wound bed.',
      procedureSteps: [
        'Wound bed preparation by debridement of non-viable tissue',
        'Hemostasis of wound bed',
        'Harvesting of split-thickness skin graft from donor site',
        'Meshing of graft if needed (allows expansion and drainage)',
        'Application of graft to wound bed',
        'Securing graft with staples, sutures, or fibrin glue',
        'Application of non-adherent dressing',
        'Donor site dressing'
      ],
      duration: '1-4 hours depending on extent of burn',
      techniques: ['Split-thickness skin grafting (STSG)', 'Full-thickness skin grafting (FTSG)', 'Mesh grafting', 'Sheet grafting for cosmetically important areas'],
      expectedBloodLoss: 'Varies with burn size; blood transfusion may be required for extensive burns',
      possibleComplications: [
        'Graft failure (partial or complete)',
        'Infection',
        'Hematoma or seroma under graft',
        'Donor site complications',
        'Scarring and contracture',
        'Anesthetic complications'
      ]
    },
    
    postoperativeInstructions: {
      immediatePostop: {
        monitoring: [
          'Vital signs every 15 minutes for first hour, then hourly',
          'Graft site observation for bleeding',
          'Pain level assessment',
          'Urine output for major burns'
        ],
        positioning: 'Elevate grafted limbs. Keep grafted area immobilized. Avoid pressure on graft site.',
        fluidManagement: 'Continue IV fluids until oral intake adequate. Monitor for fluid overload in large burns.',
        painControl: 'Patient-controlled analgesia (PCA) or regular IV/oral analgesia. Pain should be well-controlled.',
        expectedSymptoms: [
          'Moderate pain at graft and donor sites',
          'Swelling around graft site',
          'Mild fever in first 48 hours',
          'Fatigue and drowsiness'
        ],
        nursingInstructions: [
          'Do not disturb graft dressing for 5-7 days unless ordered',
          'Keep graft site immobilized',
          'Monitor for signs of graft failure or infection',
          'Maintain adequate nutrition and hydration'
        ]
      },
      woundCare: [
        { day: 'Days 1-5', instruction: 'Leave primary dressing undisturbed. Change outer dressing only if soiled.', dressingType: 'Non-adherent primary dressing', frequency: 'As needed' },
        { day: 'Day 5-7', instruction: 'First graft inspection by medical team. Assess graft take.', dressingType: 'Non-adherent dressing', frequency: 'As directed' },
        { day: 'Week 2-3', instruction: 'Transition to lighter dressings. Begin gentle wound care at home.', dressingType: 'Paraffin gauze or silicone dressing', frequency: 'Daily or every other day' },
        { day: 'Week 3 onwards', instruction: 'Continue wound moisturization. Begin scar management if healed.', dressingType: 'Silicone gel or moisturizer', frequency: 'Twice daily' }
      ],
      painManagement: {
        expectedPainLevel: 'Moderate pain (4-6/10) for first week, decreasing gradually',
        medications: ['Paracetamol 1g every 6 hours', 'Ibuprofen 400mg every 8 hours (if no contraindications)', 'Tramadol 50-100mg every 6 hours for breakthrough pain'],
        nonPharmacological: ['Elevation of affected limb', 'Cool compresses away from graft', 'Distraction techniques', 'Relaxation exercises'],
        whenToSeekHelp: 'Pain not controlled by medications, sudden increase in pain, or pain accompanied by fever and redness'
      },
      activityRestrictions: [
        { activity: 'Walking', restriction: 'Limited for leg grafts', duration: '2-3 weeks', reason: 'Prevent shearing forces on graft' },
        { activity: 'Heavy lifting', restriction: 'Avoid completely', duration: '4-6 weeks', reason: 'Prevent graft disruption' },
        { activity: 'Swimming/bathing', restriction: 'No immersion in water', duration: 'Until wound fully healed (3-4 weeks)', reason: 'Infection risk and graft damage' },
        { activity: 'Sun exposure', restriction: 'Protect grafted area from sun', duration: '12 months minimum', reason: 'Prevent hyperpigmentation and burn' }
      ],
      dietaryGuidelines: [
        'High-protein diet to promote healing (1.5-2g/kg/day)',
        'Adequate calories (30-35 kcal/kg/day for adults)',
        'Vitamin C rich foods (citrus, vegetables)',
        'Zinc-containing foods (meat, legumes)',
        'Adequate hydration (8-10 glasses of water daily)',
        'Avoid excessive alcohol'
      ],
      medicationRegimen: [
        { name: 'Paracetamol', dose: '1g', frequency: 'Every 6 hours', duration: 'As needed for pain', purpose: 'Pain relief', sideEffects: ['Rarely: liver toxicity if overdosed'] },
        { name: 'Ibuprofen', dose: '400mg', frequency: 'Every 8 hours with food', duration: '1-2 weeks', purpose: 'Pain and inflammation', sideEffects: ['Stomach upset', 'GI bleeding risk'] },
        { name: 'Antibiotics (if prescribed)', dose: 'As directed', frequency: 'As directed', duration: '5-7 days', purpose: 'Prevent/treat infection', sideEffects: ['Varies by antibiotic'] }
      ],
      physicalTherapy: {
        startTiming: 'Within 48 hours of surgery for range of motion; progressive therapy from week 2',
        frequency: 'Daily exercises, formal therapy 2-3 times per week',
        exercises: [
          { name: 'Range of motion exercises', description: 'Gentle movement of all joints to prevent stiffness', repetitions: '10 repetitions each joint', frequency: '3 times daily', progression: 'Increase range as tolerated' },
          { name: 'Stretching', description: 'Gentle sustained stretches to prevent contracture', repetitions: 'Hold 20-30 seconds', frequency: '3 times daily', progression: 'Increase stretch gradually' },
          { name: 'Strengthening', description: 'Progressive resistance exercises once wound healed', repetitions: '10-15 repetitions', frequency: 'Daily', progression: 'Increase resistance gradually' }
        ],
        precautions: ['Do not stretch over graft until well-healed', 'Stop if pain is severe', 'Maintain splints as prescribed'],
        goals: ['Maintain full range of motion', 'Prevent contractures', 'Restore strength', 'Return to normal function']
      },
      returnToWork: 'Desk work: 2-4 weeks. Physical work: 6-12 weeks depending on graft location and extent.',
      returnToNormalActivities: 'Most normal activities can resume at 4-6 weeks. Full recovery including sports: 3-6 months.'
    },
    
    expectedOutcomes: {
      shortTerm: [
        { timeframe: '1-2 weeks', expectation: 'Graft take and initial healing', indicators: ['Graft appears pink and adherent', 'No signs of infection', 'Donor site healing'] },
        { timeframe: '2-4 weeks', expectation: 'Complete wound closure', indicators: ['No open areas', 'New skin stable', 'Reduced pain'] }
      ],
      longTerm: [
        { timeframe: '3-6 months', expectation: 'Scar maturation beginning', indicators: ['Scar softening', 'Color fading', 'Improved flexibility'] },
        { timeframe: '12-24 months', expectation: 'Final scar maturation', indicators: ['Scar color normalized', 'Maximum softening achieved', 'Stable function'] }
      ],
      functionalRecovery: 'Most patients achieve near-normal function with proper rehabilitation. Outcome depends on burn location, depth, and compliance with therapy.',
      cosmeticOutcome: 'Grafted skin differs from normal skin in texture and color. Mesh patterns may be visible. Donor sites may leave scarring. Results improve over 1-2 years.',
      qualityOfLife: 'With proper treatment and rehabilitation, most patients return to normal daily activities. Psychological support may be needed for visible burns.',
      possibleComplications: [
        { complication: 'Graft failure', riskLevel: 'moderate', prevention: 'Immobilization, infection prevention, adequate nutrition', management: 'May require regrafting' },
        { complication: 'Infection', riskLevel: 'moderate', prevention: 'Aseptic technique, topical antimicrobials, early detection', management: 'Antibiotics, wound care intensification' },
        { complication: 'Contracture', riskLevel: 'moderate', prevention: 'Splinting, early mobilization, pressure therapy', management: 'Physiotherapy, may need surgical release' },
        { complication: 'Hypertrophic scarring', riskLevel: 'moderate', prevention: 'Pressure garments, silicone therapy', management: 'Scar massage, steroid injections, surgery if severe' }
      ],
      successRate: 'Split-thickness skin graft take rate is 85-95% with proper care. Full functional recovery achieved in 70-80% of patients.'
    },
    
    followUpCare: {
      schedule: [
        { timing: '1 week post-surgery', purpose: 'First graft check, suture/staple removal if ready', investigations: ['Clinical examination'], whatToExpect: 'Dressing change, assessment of graft survival, wound photos' },
        { timing: '2 weeks post-surgery', purpose: 'Confirm healing, start scar management', investigations: ['Clinical examination'], whatToExpect: 'Initiate silicone therapy, discuss pressure garments' },
        { timing: '4-6 weeks', purpose: 'Assess function, progress rehabilitation', investigations: ['Range of motion assessment'], whatToExpect: 'Physiotherapy review, adjustments to treatment plan' },
        { timing: '3 months', purpose: 'Scar assessment, detect early contracture', investigations: ['Clinical and functional assessment'], whatToExpect: 'May adjust scar management, discuss further surgery if needed' },
        { timing: '6-12 months', purpose: 'Long-term outcome assessment', investigations: ['Full functional assessment'], whatToExpect: 'Final outcome discussion, any reconstructive needs' }
      ],
      ongoingMonitoring: [
        'Scar appearance and behavior',
        'Range of motion and function',
        'Psychological wellbeing',
        'Signs of contracture development'
      ],
      rehabilitationNeeds: [
        'Continued physiotherapy as needed',
        'Occupational therapy for hand burns',
        'Pressure garment wearing for 12-24 months',
        'Regular moisturization of healed skin'
      ],
      supportServices: [
        'Burns support groups',
        'Psychological counseling services',
        'Social work for financial or vocational issues',
        'Patient education resources'
      ],
      longTermConsiderations: [
        'Annual skin checks for any concerning changes',
        'Sun protection lifelong for grafted areas',
        'May need reconstructive surgery for contractures',
        'Possible need for scar revision procedures'
      ]
    },
    
    complianceRequirements: [
      {
        requirement: 'Attend all scheduled follow-up appointments',
        importance: 'critical',
        consequence: 'Missed complications, delayed intervention for contractures or poor healing',
        tips: ['Set reminders on phone', 'Arrange transport in advance', 'Bring list of questions']
      },
      {
        requirement: 'Wear pressure garments as prescribed',
        importance: 'critical',
        consequence: 'Increased risk of hypertrophic scarring and contractures',
        tips: ['Wear 23 hours per day', 'Have spare garment for washing', 'Replace when worn (every 2-3 months)']
      },
      {
        requirement: 'Perform daily stretching exercises',
        importance: 'critical',
        consequence: 'Joint stiffness and contracture formation',
        tips: ['Set specific times each day', 'Exercise before applying pressure garments', 'Track progress']
      },
      {
        requirement: 'Protect healed skin from sun',
        importance: 'important',
        consequence: 'Permanent hyperpigmentation, increased cancer risk',
        tips: ['Use SPF 50+ sunscreen', 'Wear protective clothing', 'Avoid peak sun hours']
      },
      {
        requirement: 'Maintain adequate nutrition',
        importance: 'important',
        consequence: 'Delayed wound healing, increased infection risk',
        tips: ['Eat protein with every meal', 'Take prescribed supplements', 'Stay well hydrated']
      }
    ],
    
    whoGuidelines: [
      {
        title: 'WHO Plan for Burn Prevention and Care',
        reference: 'WHO 2018',
        keyPoints: [
          'Immediate cooling with clean running water for 20 minutes',
          'Cover burns with clean, non-fluffy material',
          'Transfer patients with major burns to specialized facilities',
          'Emphasis on prevention through safety education'
        ]
      },
      {
        title: 'WHO Emergency Triage Assessment and Treatment (ETAT)',
        reference: 'WHO Guidelines',
        keyPoints: [
          'Assessment of airway, breathing, circulation',
          'Early fluid resuscitation for major burns',
          'Pain management is essential',
          'Tetanus prophylaxis for contaminated burns'
        ]
      }
    ],
    
    warningSigns: [
      'Increasing pain not relieved by medication',
      'New blistering or skin breakdown',
      'Spreading redness around healed areas',
      'Foul-smelling discharge from wound',
      'Fever above 38°C (100.4°F)',
      'Decreased movement of affected limb',
      'Grafted skin turning dark or separating'
    ],
    
    emergencySigns: [
      'Difficulty breathing or swallowing (if face/neck involved)',
      'High fever with chills and confusion',
      'Severe uncontrolled pain',
      'Profuse bleeding from wound',
      'Signs of shock: pale, clammy skin, rapid heartbeat, confusion',
      'New burn injury',
      'Loss of consciousness'
    ]
  },
  
  // A2. Thermal Burns - Flame Burns
  {
    id: 'burns-thermal-flame',
    categoryId: 'A',
    name: 'Thermal Burns - Flame Burns',
    alternateNames: ['Fire burns', 'Contact burns', 'Flash burns'],
    icdCode: 'T20-T25',
    
    overview: {
      definition: 'Flame burns are thermal injuries resulting from direct exposure to fire, open flames, or flash fires. These typically cause deeper injuries than scalds and commonly involve larger body surface areas. Associated injuries may include inhalation injury, carbon monoxide poisoning, and trauma.',
      causes: [
        'House fires and building fires',
        'Motor vehicle accidents with fire',
        'Clothing catching fire',
        'Cooking accidents with open flames',
        'Bush fires and outdoor fires',
        'Deliberate burns (assault or self-harm)',
        'Industrial accidents'
      ],
      riskFactors: [
        'Smoking, especially in bed',
        'Alcohol or drug intoxication',
        'Faulty electrical wiring',
        'Lack of smoke detectors',
        'Improper storage of flammable materials',
        'Psychiatric conditions (self-harm risk)',
        'Poverty and inadequate housing'
      ],
      symptoms: [
        'Severe pain (may be absent in deep burns)',
        'Charred, black, or leathery skin in full-thickness burns',
        'White, waxy appearance',
        'Red, blistered areas in partial-thickness regions',
        'Singed hair',
        'Smoke inhalation signs: hoarse voice, cough, soot in nose/mouth',
        'Respiratory distress if inhalation injury present'
      ],
      diagnosis: [
        'Full burn assessment including TBSA calculation',
        'Airway evaluation for inhalation injury',
        'Blood gas analysis including carboxyhemoglobin levels',
        'Chest X-ray',
        'Full trauma survey if mechanism suggests injury',
        'ECG if electrical component or cardiac history'
      ],
      classification: [
        {
          name: 'American Burn Association Burn Severity Classification',
          description: 'Determines level of care needed',
          grades: [
            { grade: 'Minor Burns', description: '<10% TBSA in adults, <5% in children', characteristics: ['Partial thickness burns', 'No special areas', 'Outpatient management possible'] },
            { grade: 'Moderate Burns', description: '10-20% TBSA in adults, 5-10% in children', characteristics: ['Partial thickness burns', 'May involve special areas', 'Usually require hospitalization'] },
            { grade: 'Major Burns', description: '>20% TBSA in adults, >10% in children', characteristics: ['Full thickness burns', 'Inhalation injury', 'Special areas involved', 'Require burn center care'] }
          ]
        }
      ],
      epidemiology: 'Flame burns represent 40-50% of burn center admissions. They have higher mortality than scalds due to greater depth and area affected. Associated inhalation injury increases mortality significantly.',
      prognosis: 'Depends on TBSA, age, inhalation injury, and pre-existing conditions. Baux score (age + %TBSA) provides mortality estimate. Modern burn care has improved survival significantly.'
    },
    
    treatmentPhases: [
      {
        phase: 1,
        name: 'Resuscitation Phase (0-72 hours)',
        duration: '0-72 hours',
        description: 'Life-saving measures including airway management, fluid resuscitation, and preventing further injury. This phase is critical for survival in major burns.',
        goals: [
          'Secure and protect airway (early intubation if needed)',
          'Establish IV access and begin fluid resuscitation',
          'Prevent hypothermia',
          'Assess and treat associated injuries',
          'Control pain',
          'Prevent wound infection'
        ],
        interventions: [
          'Endotracheal intubation if signs of inhalation injury',
          'Fluid resuscitation using Parkland formula: 4ml/kg/%TBSA',
          'Central venous access for large burns',
          'Urinary catheter and hourly output monitoring',
          'Nasogastric tube for burns >25% TBSA',
          'Escharotomy if circumferential burns causing restriction',
          'Early wound coverage with temporary dressings'
        ],
        milestones: [
          'Stable airway',
          'Adequate urine output (0.5-1ml/kg/hr)',
          'Hemodynamic stability',
          'Pain controlled'
        ],
        nursingCare: [
          'Continuous vital signs monitoring',
          'Hourly urine output measurement',
          'Strict fluid balance charting',
          'Body temperature monitoring and warming measures',
          'Head elevation if facial burns'
        ]
      },
      {
        phase: 2,
        name: 'Acute/Wound Care Phase (3 days - 6 weeks)',
        duration: '3 days to 6 weeks',
        description: 'Focus on wound healing, infection prevention, nutritional support, and surgical intervention.',
        goals: [
          'Achieve wound closure (spontaneous or surgical)',
          'Prevent and treat infection',
          'Maintain nutritional status',
          'Preserve function through early mobilization'
        ],
        interventions: [
          'Surgical debridement of eschar',
          'Early excision and grafting (within 5-7 days)',
          'Enteral nutrition (high protein, high calorie)',
          'Topical antimicrobial therapy',
          'Splinting and positioning',
          'Blood transfusion as needed'
        ],
        milestones: [
          'All wounds debrided',
          'Successful graft take',
          'No clinical sepsis',
          'Meeting nutritional targets'
        ]
      },
      {
        phase: 3,
        name: 'Rehabilitation Phase (6 weeks - 2+ years)',
        duration: '6 weeks to 2+ years',
        description: 'Long-term recovery focusing on function, appearance, and psychological wellbeing.',
        goals: [
          'Maximize functional recovery',
          'Minimize scarring and contractures',
          'Address psychological trauma',
          'Return to community and work'
        ],
        interventions: [
          'Intensive physical and occupational therapy',
          'Pressure garment therapy',
          'Reconstructive surgery as needed',
          'Psychological support and counseling',
          'Scar management (silicone, laser, steroids)',
          'Social reintegration programs'
        ],
        milestones: [
          'Independence in activities of daily living',
          'Return to work or education',
          'Psychological adjustment',
          'Completed reconstructive procedures'
        ]
      }
    ],
    
    preoperativeInstructions: {
      consultations: [
        'Burn surgery team assessment',
        'Anesthesia evaluation (especially if inhalation injury)',
        'Critical care involvement for major burns',
        'Nutritional team for caloric needs'
      ],
      investigations: [
        'Full blood count and coagulation profile',
        'Blood typing and crossmatch',
        'Urea, electrolytes, creatinine',
        'Liver function tests',
        'Blood gas analysis',
        'Chest X-ray',
        'Wound cultures if infection suspected'
      ],
      medications: [
        { medication: 'Blood thinners', instruction: 'stop', timing: 'As directed by team', reason: 'Excessive bleeding during surgery' },
        { medication: 'Nutritional supplements', instruction: 'continue', reason: 'Essential for healing' },
        { medication: 'Stress ulcer prophylaxis', instruction: 'continue', reason: 'Prevent Curling ulcer' }
      ],
      dietaryRestrictions: [
        'Nil by mouth 6 hours before surgery',
        'Continue enteral feeding until 4-6 hours pre-op if on tube feeding'
      ],
      physicalPreparation: [
        'Pre-operative bathing with antiseptic if possible',
        'Mark donor sites',
        'Optimize nutritional status',
        'Correct anemia if present'
      ],
      psychologicalPreparation: [
        'Explain surgical plan and expected outcomes',
        'Discuss possibility of multiple operations',
        'Address anxiety about appearance',
        'Involve family in planning'
      ],
      consentRequirements: [
        'Consent for debridement and skin grafting',
        'Blood transfusion consent',
        'Consent for photography',
        'Discussion of risks including graft failure, infection, scarring, need for further surgery'
      ],
      dayBeforeSurgery: [
        'Continue high-protein feeding until fasting begins',
        'Ensure blood products are available',
        'Final surgical planning and marking'
      ],
      dayOfSurgery: [
        'Fasting as instructed',
        'Pre-operative medications as ordered',
        'Final vital signs check',
        'Confirm blood availability'
      ]
    },
    
    intraoperativeInfo: {
      anesthesiaType: ['General anesthesia', 'May require prolonged anesthesia for large burns'],
      procedureDescription: 'Tangential or fascial excision of burn eschar followed by application of skin grafts. Large burns may require staged procedures. Temporary wound coverage (cadaveric allograft, xenograft, or synthetic substitutes) may be used when autograft is limited.',
      procedureSteps: [
        'Debridement of necrotic tissue',
        'Hemostasis of wound bed',
        'Harvest of split-thickness skin grafts',
        'Application of grafts (meshed or sheet)',
        'Temporary coverage if insufficient donor sites',
        'Dressing application',
        'Positioning in splints if needed'
      ],
      duration: '2-6 hours or more for extensive burns',
      techniques: ['Tangential excision', 'Fascial excision', 'Mesh grafting', 'Integra or dermal substitutes if available'],
      expectedBloodLoss: 'Significant; often requires blood transfusion. Plan 1 unit per 1% TBSA excised.',
      possibleComplications: [
        'Massive blood loss',
        'Hypothermia',
        'Graft failure',
        'Infection and sepsis',
        'Respiratory complications',
        'Cardiac arrhythmias'
      ]
    },
    
    postoperativeInstructions: {
      immediatePostop: {
        monitoring: [
          'Continuous vital signs monitoring in ICU/HDU',
          'Hourly urine output',
          'Hemoglobin levels',
          'Temperature',
          'Graft site observation'
        ],
        positioning: 'Position to avoid pressure on grafts. Elevate limbs. Anti-contracture positioning.',
        fluidManagement: 'Continue IV fluids based on urine output. Transition to enteral feeding ASAP.',
        painControl: 'Multimodal analgesia including opioids. May need patient-controlled analgesia.',
        expectedSymptoms: [
          'Pain at graft and donor sites',
          'Blood-stained drainage initially',
          'Fatigue and weakness',
          'Emotional distress'
        ],
        nursingInstructions: [
          'Strict aseptic technique for all wound care',
          'Monitor for signs of sepsis',
          'Maintain body temperature',
          'Ensure adequate nutrition delivery',
          'Early mobilization within limits'
        ]
      },
      woundCare: [
        { day: 'Days 1-5', instruction: 'Do not disturb primary graft dressing. Change outer layers only if saturated.', dressingType: 'Non-adherent gauze, bulky outer dressing' },
        { day: 'Days 5-7', instruction: 'First formal graft inspection. Remove non-adherent graft areas if present.', dressingType: 'Appropriate based on assessment' },
        { day: 'Week 2-4', instruction: 'Continue wound care until fully healed. Begin scar management for healed areas.', dressingType: 'Light dressings, transition to scar management' }
      ],
      painManagement: {
        expectedPainLevel: 'Moderate to severe initially, especially during dressing changes',
        medications: ['Strong opioids (morphine, oxycodone)', 'Paracetamol', 'Gabapentin for neuropathic pain'],
        nonPharmacological: ['Pre-medication before dressing changes', 'Distraction therapy', 'Music therapy', 'Virtual reality where available'],
        whenToSeekHelp: 'Uncontrolled pain, sudden increase in pain with fever, or pain preventing participation in therapy'
      },
      activityRestrictions: [
        { activity: 'All activities', restriction: 'Limited during healing phase', duration: 'Until grafts stable (2-3 weeks)', reason: 'Graft protection' },
        { activity: 'Return to normal activities', restriction: 'Gradual increase', duration: '3-6 months', reason: 'Allow full healing and scar maturation' }
      ],
      dietaryGuidelines: [
        'High calorie intake: 30-40 kcal/kg/day',
        'High protein: 1.5-2g/kg/day',
        'Vitamin C: 1-2g daily',
        'Zinc supplementation: 220mg twice daily',
        'Vitamin A and E',
        'Adequate fluid intake'
      ],
      medicationRegimen: [
        { name: 'Analgesia', dose: 'As prescribed', frequency: 'Regular and PRN', duration: 'As needed', purpose: 'Pain control' },
        { name: 'Multivitamins with zinc', dose: 'As prescribed', frequency: 'Once daily', duration: 'Until healed', purpose: 'Support healing' },
        { name: 'Stress ulcer prophylaxis', dose: 'Pantoprazole 40mg', frequency: 'Once daily', duration: 'During acute phase', purpose: 'Prevent GI bleeding' },
        { name: 'Anticoagulation', dose: 'As prescribed', frequency: 'Per protocol', duration: 'During immobilization', purpose: 'Prevent DVT' }
      ],
      physicalTherapy: {
        startTiming: 'Within 24-48 hours post-surgery',
        frequency: 'Daily, multiple sessions',
        exercises: [
          { name: 'Range of motion', description: 'Active and passive movements of all joints', repetitions: '10 each joint', frequency: '3-4 times daily' },
          { name: 'Splint positioning', description: 'Anti-deformity positions', repetitions: 'Continuous except during therapy', frequency: 'As prescribed' },
          { name: 'Ambulation', description: 'Early walking when stable', repetitions: 'As tolerated', frequency: 'Daily' }
        ],
        precautions: ['Protect graft sites during movement', 'Monitor for graft shear', 'Balance rest and activity'],
        goals: ['Prevent contractures', 'Maintain strength', 'Early return to function']
      },
      returnToWork: 'Variable based on burn severity and occupation. Minor burns: 2-4 weeks. Major burns: 3-12 months or longer.',
      returnToNormalActivities: 'Gradual return over months. Full recovery may take 1-2 years for major burns.'
    },
    
    expectedOutcomes: {
      shortTerm: [
        { timeframe: '2-4 weeks', expectation: 'Wound closure achieved', indicators: ['Successful graft take', 'No open wounds', 'Stable skin'] }
      ],
      longTerm: [
        { timeframe: '1-2 years', expectation: 'Scar maturation and functional optimization', indicators: ['Soft, pliable scars', 'Full range of motion', 'Return to activities'] }
      ],
      functionalRecovery: 'Depends on burn location and depth. Hand and face burns require intensive rehabilitation. Most patients achieve good functional outcomes with comprehensive care.',
      cosmeticOutcome: 'Significant scarring expected. Appearance improves over 1-2 years. May require reconstructive surgery.',
      qualityOfLife: 'Long-term quality of life generally good with proper rehabilitation. Psychological support is essential.',
      possibleComplications: [
        { complication: 'Sepsis', riskLevel: 'high', prevention: 'Early excision, infection control, nutrition', management: 'Aggressive antibiotics, source control' },
        { complication: 'Contractures', riskLevel: 'high', prevention: 'Splinting, positioning, therapy', management: 'Surgical release' },
        { complication: 'PTSD', riskLevel: 'moderate', prevention: 'Early psychological support', management: 'Professional counseling, medication' }
      ],
      successRate: 'Survival rates have improved dramatically. Minor burns: >99%. Major burns: 80-90% in specialized centers.'
    },
    
    followUpCare: {
      schedule: [
        { timing: '1 week', purpose: 'Graft assessment', whatToExpect: 'Dressing changes, wound evaluation' },
        { timing: '2-4 weeks', purpose: 'Healing confirmation', whatToExpect: 'Start scar management' },
        { timing: '3 months', purpose: 'Rehabilitation review', whatToExpect: 'Adjust therapy, assess for contractures' },
        { timing: '6-12 months', purpose: 'Long-term assessment', whatToExpect: 'Plan reconstruction if needed' },
        { timing: 'Annually', purpose: 'Ongoing monitoring', whatToExpect: 'Check for late complications' }
      ],
      ongoingMonitoring: ['Scar progression', 'Functional status', 'Psychological wellbeing', 'Need for reconstruction'],
      rehabilitationNeeds: ['Pressure garments for 12-24 months', 'Ongoing physiotherapy', 'Occupational therapy', 'Psychological support'],
      supportServices: ['Burn survivor support groups', 'Return to work programs', 'Family counseling', 'Financial support services'],
      longTermConsiderations: ['Annual reviews', 'Reconstructive surgery planning', 'Career counseling', 'Long-term scar management']
    },
    
    complianceRequirements: [
      { requirement: 'Pressure garment therapy', importance: 'critical', consequence: 'Severe hypertrophic scarring', tips: ['Wear 23 hours/day', 'Have spare set', 'Replace every 2-3 months'] },
      { requirement: 'Physical therapy exercises', importance: 'critical', consequence: 'Contractures limiting function', tips: ['Schedule specific times', 'Keep exercise diary', 'Report difficulties'] },
      { requirement: 'Nutritional compliance', importance: 'critical', consequence: 'Poor healing, increased infection', tips: ['Eat high-protein foods', 'Take supplements', 'Track intake'] },
      { requirement: 'Follow-up attendance', importance: 'critical', consequence: 'Missed complications', tips: ['Schedule in advance', 'Arrange transport', 'Bring concerns list'] },
      { requirement: 'Psychological support engagement', importance: 'important', consequence: 'Depression, PTSD, poor adjustment', tips: ['Attend counseling', 'Join support groups', 'Speak up about struggles'] }
    ],
    
    whoGuidelines: [
      {
        title: 'WHO Burns Management Guidelines',
        reference: 'WHO 2018',
        keyPoints: [
          'Early resuscitation is key to survival',
          'Early wound closure reduces infection and mortality',
          'Multidisciplinary care improves outcomes',
          'Rehabilitation should start early'
        ]
      }
    ],
    
    warningSigns: [
      'Fever or chills',
      'Increasing wound redness or discharge',
      'Foul smell from wounds',
      'Decreased appetite or confusion',
      'Graft areas becoming dark or separating',
      'Difficulty moving joints'
    ],
    
    emergencySigns: [
      'High fever with confusion',
      'Breathing difficulty',
      'Chest pain',
      'Profuse bleeding',
      'Signs of shock',
      'Severe uncontrolled pain'
    ]
  }
];

export default burnsEducationContent;
