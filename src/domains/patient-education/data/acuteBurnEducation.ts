/**
 * Acute Burn Injuries and Initial Wound Management Education
 * Dr Nnadi-Burns Plastic and Reconstructive Surgery Services
 * 
 * Comprehensive patient education for acute burn injuries
 */

import type { EducationCondition } from '../types';

export const acuteBurnInjuries: EducationCondition = {
  id: 'acute-burn-injuries',
  name: 'Acute Burn Injuries and Initial Wound Management',
  description: 'Essential information for patients with acute burn injuries from the scene to hospital care',
  category: 'Burns',
  
  overview: {
    definition: 'A burn injury is damage to the skin and underlying tissues caused by heat, chemicals, electricity, radiation, or friction. The severity depends on the cause, depth, and extent of the burn.',
    causes: [
      'Thermal burns: flames, hot liquids (scalds), hot objects, steam',
      'Chemical burns: acids, alkalis, industrial chemicals',
      'Electrical burns: household current, high voltage, lightning',
      'Radiation burns: sunburn, radiation therapy',
      'Friction burns: road rash, rope burns',
    ],
    riskFactors: [
      'Children under 5 years (kitchen accidents, bath scalds)',
      'Elderly individuals (reduced mobility and sensation)',
      'Occupational exposure (cooking, welding, chemical handling)',
      'Domestic settings without safety measures',
      'Epilepsy or conditions causing loss of consciousness',
      'Alcohol or drug intoxication',
      'Inadequate fire safety in homes',
    ],
    symptoms: [
      'Pain at the burn site (absent in deep burns)',
      'Redness and swelling',
      'Blistering (partial thickness burns)',
      'White, brown, or black discoloration (deep burns)',
      'Peeling skin',
      'Shock symptoms in severe burns (pale, cold, rapid pulse)',
    ],
    diagnosis: [
      'Clinical assessment of burn depth and extent',
      'Total Body Surface Area (TBSA) calculation',
      'Assessment of airway involvement',
      'Blood tests for electrolytes, blood count, kidney function',
    ],
    complications: [
      'Infection and sepsis',
      'Hypovolaemic shock from fluid loss',
      'Inhalation injury and airway compromise',
      'Scarring and contractures',
      'Psychological trauma',
      'Loss of limb or function',
    ],
    epidemiology: 'Burns are a significant cause of morbidity and mortality in Nigeria, with domestic accidents being the most common cause. Children and women are disproportionately affected.',
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'First Aid at the Scene',
      duration: 'Immediate (first 20 minutes)',
      description: 'Critical first-aid measures that can significantly reduce burn severity and improve outcomes.',
      goals: [
        'Stop the burning process',
        'Cool the burn to reduce tissue damage',
        'Protect the wound from contamination',
        'Seek medical help promptly',
      ],
      interventions: [
        'STOP the burning: remove the person from the source of burn',
        'COOL the burn with clean, running cool water for 20 minutes',
        'CALL for emergency help or arrange transport to hospital',
        'COVER the burn loosely with clean cloth or cling film',
      ],
      activities: [
        'Remove clothing and jewelry near the burn (unless stuck to skin)',
        'Do NOT apply ice, butter, toothpaste, egg white, or traditional remedies',
        'Do NOT burst blisters',
        'Keep the person warm (cover unburnt areas)',
        'Give sips of water if the person is alert and can swallow',
        'Raise burnt limbs if possible to reduce swelling',
      ],
      warningSignsThisPhase: [
        'Difficulty breathing or hoarse voice (airway burn)',
        'Burns to face, hands, feet, genitals, or around joints',
        'Circumferential burns (going all around a limb)',
        'Burns larger than the palm of the hand',
        'Chemical or electrical burns',
        'Burns in children, elderly, or pregnant women',
      ],
    },
    {
      phase: 2,
      name: 'Hospital Assessment and Resuscitation',
      duration: 'First 24-48 hours',
      description: 'Emergency department and burns unit care focusing on life-saving measures and fluid replacement.',
      goals: [
        'Assess and secure the airway',
        'Calculate burn extent and start fluid resuscitation',
        'Provide adequate pain control',
        'Prevent infection',
        'Plan wound management',
      ],
      interventions: [
        'Airway assessment and intubation if needed',
        'IV access and fluid resuscitation using Parkland formula',
        'Urinary catheter to monitor output',
        'Pain management with IV analgesics',
        'Tetanus prophylaxis',
        'Wound assessment and initial cleaning',
      ],
      activities: [
        'Allow medical team to examine and treat the burns',
        'Provide accurate history of how the burn occurred',
        'List any medical conditions and allergies',
        'Inform staff of any medications you take',
        'Report pain honestly so it can be controlled',
      ],
      medications: [
        {
          name: 'IV Fluids (Ringer\'s Lactate)',
          purpose: 'Replace fluid lost through the burn wounds',
          duration: 'First 24-48 hours',
        },
        {
          name: 'Morphine or Ketamine',
          purpose: 'Control severe pain, especially during dressing changes',
          duration: 'As needed',
        },
        {
          name: 'Tetanus Toxoid',
          purpose: 'Prevent tetanus infection',
          duration: 'Single dose if not up to date',
        },
      ],
    },
    {
      phase: 3,
      name: 'Acute Wound Care Phase',
      duration: 'Days 2-14',
      description: 'Active wound management to promote healing and prevent infection.',
      goals: [
        'Keep wounds clean and protected',
        'Promote epithelialization (skin regrowth)',
        'Prevent infection',
        'Assess need for surgery (debridement, grafting)',
        'Maintain nutrition for healing',
      ],
      interventions: [
        'Regular wound cleaning and dressing changes',
        'Topical antimicrobial agents (silver sulfadiazine, honey-based dressings)',
        'Surgical debridement of dead tissue if needed',
        'Skin grafting for deep burns',
        'Nutritional support with high-protein, high-calorie diet',
      ],
      activities: [
        'Participate in dressing changes (deep breathing, distraction)',
        'Eat all meals provided - healing requires extra nutrition',
        'Report increased pain or changes in the wound',
        'Begin gentle exercises as directed by physiotherapy',
        'Maintain a positive mindset - healing takes time',
      ],
    },
    {
      phase: 4,
      name: 'Recovery and Rehabilitation',
      duration: 'Weeks to months',
      description: 'Ongoing healing, scar management, and functional recovery.',
      goals: [
        'Complete wound healing',
        'Prevent contractures and preserve function',
        'Manage scarring',
        'Provide psychological support',
        'Return to normal activities',
      ],
      interventions: [
        'Physiotherapy and occupational therapy',
        'Pressure garments for scar management',
        'Silicone therapy for scars',
        'Counselling and psychological support',
        'Surgical revision if needed',
      ],
      activities: [
        'Perform prescribed exercises daily',
        'Wear pressure garments as instructed',
        'Apply moisturizers and scar products',
        'Protect healed skin from sun',
        'Attend all follow-up appointments',
        'Seek support from family and counsellors',
      ],
    },
  ],
  
  preoperativeInstructions: {
    consultations: [
      'Burns surgeon assessment',
      'Anaesthetist review for surgical planning',
      'Physiotherapy baseline assessment',
    ],
    investigations: [
      'Full blood count',
      'Electrolytes and kidney function',
      'Blood group and crossmatch',
      'Wound swabs for culture if infection suspected',
      'Chest X-ray if inhalation injury suspected',
    ],
    medications: [],
    dietaryRestrictions: [
      'Fasting as per anaesthesia guidelines before surgery',
    ],
    physicalPreparation: [
      'Wound cleaning before theatre',
      'Removal of all dressings in preparation',
    ],
    dayBeforeSurgery: [
      'Confirm surgery is scheduled',
      'Ensure fasting instructions are clear',
      'Rest and stay calm',
    ],
    dayOfSurgery: [
      'Remain nil by mouth as instructed',
      'Nursing staff will prepare you for theatre',
      'Family can wait in the designated area',
    ],
    fastingInstructions: 'No food for 6 hours and no clear fluids for 2 hours before surgery, as instructed by the anaesthetist.',
  },
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Position grafted areas as directed - often elevated to reduce swelling',
      painManagement: 'Pain medication will be given regularly - inform staff of your pain level',
      activityLevel: 'Strict bed rest for grafted areas initially, usually 5-7 days',
      expectedSymptoms: [
        'Pain and discomfort at graft and donor sites',
        'Swelling in grafted areas',
        'Oozing from wounds initially',
        'Itching as healing progresses',
      ],
      nursingInstructions: [
        'Monitor graft viability (colour, warmth)',
        'Keep grafts immobilized',
        'Manage pain and hydration',
        'High-protein nutrition',
      ],
    },
    woundCare: [
      {
        day: 'Days 1-5 post-graft',
        instruction: 'Grafts remain covered and undisturbed. Keep area immobilized.',
        dressingType: 'Tie-over dressing or secured graft dressing',
        frequency: 'First look at day 5 unless problems arise',
      },
      {
        day: 'Days 5-10',
        instruction: 'First dressing change, assess graft take. Gentle cleaning.',
        dressingType: 'Non-adherent dressing',
        frequency: 'Every 2-3 days',
      },
      {
        day: 'Days 10-21',
        instruction: 'Gradual mobilization as graft stabilizes. Continue wound care.',
        dressingType: 'Light dressing as needed',
        frequency: 'As directed',
      },
    ],
    painManagement: {
      expectedPainLevel: 'Moderate to severe pain, especially during dressing changes. Pain decreases as healing progresses.',
      medications: [
        'Paracetamol - regular dosing',
        'NSAIDs if not contraindicated',
        'Opioids for severe pain and dressing changes',
        'Gabapentin or pregabalin for nerve pain/itching',
      ],
      nonPharmacological: [
        'Distraction during dressing changes (music, conversation)',
        'Cool compresses for donor sites',
        'Positioning for comfort',
        'Relaxation and breathing techniques',
      ],
      whenToSeekHelp: 'If pain suddenly worsens, is not controlled by medications, or is accompanied by fever or wound changes.',
    },
    activityRestrictions: [
      {
        activity: 'Mobilization of grafted limbs',
        restriction: 'Strict immobilization initially',
        duration: '5-10 days or as instructed',
        reason: 'Movement can shear grafts and cause failure',
      },
      {
        activity: 'Showering',
        restriction: 'No direct water on grafts',
        duration: 'Until grafts are well-healed (2-3 weeks)',
        reason: 'Prevents graft displacement and infection',
      },
    ],
    dietaryGuidelines: [
      'High-protein diet essential for healing (eggs, fish, meat, beans, milk)',
      'Extra calories needed - burns increase metabolic rate significantly',
      'Vitamin C (citrus fruits, tomatoes) for wound healing',
      'Zinc (meat, nuts, legumes) for skin repair',
      'Plenty of fluids to stay hydrated',
      'Nutritional supplements as prescribed',
    ],
    returnToWork: 'Depends on burn severity and job type. May range from 2 weeks to several months.',
    returnToNormalActivities: 'Gradual return over weeks to months. Full recovery may take 6-12 months or longer for extensive burns.',
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '2-3 weeks',
        expectation: 'Superficial burns healed, deep burns grafted and stabilizing',
        indicators: ['Wound closure', 'Graft take', 'Pain decreasing'],
      },
    ],
    longTerm: [
      {
        timeframe: '3-6 months',
        expectation: 'Wounds fully healed, scar maturation beginning',
        indicators: ['Scars flattening', 'Function improving', 'Able to perform daily activities'],
      },
      {
        timeframe: '1-2 years',
        expectation: 'Scars mature, maximal function achieved',
        indicators: ['Soft, pale scars', 'Full range of motion', 'Psychological adjustment'],
      },
    ],
    functionalRecovery: 'Depends on burn location and depth. Early physiotherapy is essential to maintain function. Some patients achieve full recovery; others may have permanent limitations.',
    cosmeticOutcome: 'Scars are permanent but improve over 12-18 months. Further surgical revision may be possible after scar maturation.',
    possibleComplications: [
      'Scar contractures limiting movement',
      'Hypertrophic or keloid scarring',
      'Chronic pain or itching',
      'Psychological impact (PTSD, depression)',
      'Need for multiple revision surgeries',
    ],
  },
  
  followUpCare: {
    schedule: [
      {
        timing: '1 week post-discharge',
        purpose: 'Wound check, dressing change, graft assessment',
        whatToExpect: 'Examination of healing, adjustment of treatment plan',
      },
      {
        timing: '2-4 weeks',
        purpose: 'Assess healing, start scar management, physiotherapy review',
        whatToExpect: 'Fitting for pressure garments, exercise program',
      },
      {
        timing: '3 months',
        purpose: 'Evaluate scar development, function, psychological wellbeing',
        whatToExpect: 'Scar assessment, therapy adjustments, counselling referral if needed',
      },
      {
        timing: '6-12 months',
        purpose: 'Long-term outcome review, plan any revisions',
        whatToExpect: 'Assessment for contracture release or scar revision surgery',
      },
    ],
    ongoingMonitoring: [
      'Scar development and contracture formation',
      'Range of motion and function',
      'Psychological adjustment',
      'Skin care of healed areas',
    ],
    rehabilitationNeeds: [
      'Physiotherapy for range of motion and strength',
      'Occupational therapy for daily activities',
      'Pressure garment therapy for scars',
      'Psychological counselling',
    ],
    lifestyleModifications: [
      'Protect healed skin from sun (use sunscreen SPF 30+)',
      'Moisturize healed skin regularly',
      'Wear pressure garments as prescribed',
      'Perform exercises daily',
      'Stay well-nourished',
      'Avoid smoking',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Wear pressure garments 23 hours per day',
      importance: 'critical',
      consequence: 'Poor scar outcome, hypertrophic scarring, contractures',
      tips: ['Remove only for bathing', 'Have two sets to rotate', 'Wash garments daily'],
    },
    {
      requirement: 'Perform physiotherapy exercises daily',
      importance: 'critical',
      consequence: 'Joint stiffness, contractures, loss of function',
      tips: ['Set specific exercise times', 'Exercise during pressure garment changes'],
    },
    {
      requirement: 'Attend all follow-up appointments',
      importance: 'critical',
      consequence: 'Missed complications, delayed treatment of contractures',
      tips: ['Keep appointment card visible', 'Arrange transport in advance'],
    },
    {
      requirement: 'Maintain high-protein diet',
      importance: 'important',
      consequence: 'Delayed healing, poor scar outcome',
      tips: ['Include protein in every meal', 'Use protein supplements if needed'],
    },
  ],
  
  warningSigns: [
    'Fever above 38°C (100.4°F)',
    'Increasing pain, redness, or swelling',
    'Foul-smelling or purulent discharge',
    'Graft changing colour (pale, blue, or black)',
    'Wound breaking down or opening',
    'Increasing difficulty moving affected areas',
  ],
  
  emergencySigns: [
    'High fever with chills and confusion (sepsis)',
    'Difficulty breathing',
    'Sudden severe pain in a limb with swelling',
    'Uncontrolled bleeding',
    'Signs of severe allergic reaction',
  ],
};

export const acuteBurnEducationList: EducationCondition[] = [
  acuteBurnInjuries,
];
