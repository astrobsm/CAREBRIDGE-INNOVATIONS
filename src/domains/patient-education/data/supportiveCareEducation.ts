/**
 * Supportive Care Education Content
 * Dr Nnadi-Burns Plastic and Reconstructive Surgery Services
 * 
 * Contains: Pressure Sores, Prosthetics/Amputation, Minor Procedures,
 * Pain Management, Nutrition/Diabetes, Infection Prevention,
 * Cultural/Financial/Psychosocial Issues, Follow-up Planning
 */

import type { EducationCondition } from '../types';

export const pressureSoreEducation: EducationCondition = {
  id: 'pressure-sores',
  name: 'Pressure Sore Prevention and Management',
  description: 'Guide for patients and caregivers on preventing and treating pressure injuries',
  category: 'Wound Care',
  
  overview: {
    definition: 'Pressure sores (pressure ulcers, bedsores, decubitus ulcers) are injuries to the skin and underlying tissue caused by prolonged pressure, usually over bony prominences. They range from superficial skin damage to deep wounds exposing muscle or bone.',
    causes: [
      'Prolonged pressure on skin',
      'Friction and shear forces',
      'Moisture (incontinence, sweating)',
      'Poor nutrition',
      'Reduced blood flow',
    ],
    riskFactors: [
      'Immobility (paralysis, coma, post-surgery)',
      'Wheelchair or bed confinement',
      'Advanced age',
      'Malnutrition and dehydration',
      'Incontinence',
      'Diabetes and vascular disease',
      'Sensory impairment (cannot feel discomfort)',
      'Previous pressure sores',
    ],
    symptoms: [
      'Redness that does not blanch (turn white) with pressure',
      'Skin discoloration',
      'Blistering',
      'Open wound',
      'Pain or tenderness',
      'Foul smell (if infected)',
    ],
    complications: [
      'Wound infection',
      'Cellulitis',
      'Bone infection (osteomyelitis)',
      'Sepsis',
      'Prolonged hospitalization',
      'Need for surgery',
    ],
    epidemiology: 'Pressure sores affect 10-18% of hospitalized patients. They are largely preventable with proper care.',
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Prevention (Most Important)',
      duration: 'Ongoing',
      description: 'Measures to prevent pressure sores from developing.',
      goals: [
        'Relieve pressure regularly',
        'Maintain skin integrity',
        'Optimize nutrition',
        'Manage incontinence',
      ],
      activities: [
        'Turn or reposition every 2 hours (bed) or every 15-30 minutes (wheelchair)',
        'Use pressure-relieving mattress or cushion',
        'Keep skin clean and dry',
        'Moisturize dry skin',
        'Change incontinence pads promptly',
        'Inspect skin daily, especially over bony areas',
        'Maintain good nutrition and hydration',
        'Avoid dragging when moving - lift patient',
      ],
    },
    {
      phase: 2,
      name: 'Conservative Wound Management',
      duration: 'Weeks to months',
      description: 'Treatment of pressure sores without surgery.',
      goals: [
        'Remove pressure from wound',
        'Promote wound healing',
        'Treat infection if present',
        'Optimize nutrition',
      ],
      interventions: [
        'Offloading (special mattresses, cushions, positioning)',
        'Regular wound cleaning',
        'Appropriate dressings',
        'Debridement of dead tissue',
        'Nutritional supplementation',
        'Treatment of underlying conditions',
      ],
    },
    {
      phase: 3,
      name: 'Surgical Treatment (Large/Deep Wounds)',
      duration: 'Varies',
      description: 'Surgical closure of wounds that will not heal conservatively.',
      goals: [
        'Clean wound bed',
        'Provide durable coverage',
        'Enable rehabilitation',
      ],
      interventions: [
        'Surgical debridement',
        'Flap reconstruction',
        'Post-operative bed rest (flap dependent)',
        'Gradual pressure loading',
      ],
    },
  ],
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Strict offloading of operated area - specific bed and positioning protocol',
      painManagement: 'Regular pain medications',
      activityLevel: 'Bed rest initially, very gradual pressure loading over weeks',
      expectedSymptoms: [
        'Swelling of flap',
        'Drains in place',
        'Need to maintain strict position',
      ],
    },
    woundCare: [
      {
        day: 'Days 1-14',
        instruction: 'Wound monitored by nursing staff. Keep pressure off.',
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Gradual sitting protocol if applicable. Very slow progression.',
      },
    ],
    painManagement: {
      expectedPainLevel: 'Variable - some patients have reduced sensation.',
      medications: ['Paracetamol', 'Opioids if needed'],
      nonPharmacological: ['Positioning', 'Pressure relief'],
    },
    activityRestrictions: [
      {
        activity: 'Sitting on repaired sacral/ischial sore',
        restriction: 'Complete offloading initially',
        duration: '3-6 weeks with very gradual loading',
        reason: 'Flap survival and healing',
      },
    ],
    dietaryGuidelines: [
      'High-protein diet (1.5-2g/kg/day)',
      'Adequate calories',
      'Vitamin C supplementation',
      'Zinc supplementation',
      'Adequate hydration',
    ],
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '6 weeks',
        expectation: 'Wound healed surgically, gradual loading begun',
        indicators: ['Flap stable', 'Beginning sitting protocol'],
      },
    ],
    longTerm: [
      {
        timeframe: '3-6 months',
        expectation: 'Full sitting tolerance, wound stable',
        indicators: ['Able to sit for hours', 'No wound breakdown'],
      },
    ],
    functionalRecovery: 'Depends on underlying condition. Goal is to return to previous level of function.',
    possibleComplications: [
      'Wound breakdown (common, especially with poor compliance)',
      'Recurrence',
      'Need for revision surgery',
    ],
  },
  
  followUpCare: {
    schedule: [
      { timing: '1-2 weeks', purpose: 'Wound check' },
      { timing: 'Weekly during sitting protocol', purpose: 'Monitor for breakdown' },
      { timing: 'Long-term', purpose: 'Prevention maintenance' },
    ],
    lifestyleModifications: [
      'Lifetime pressure relief practices',
      'Regular skin inspection',
      'Good nutrition maintenance',
      'Proper wheelchair cushion and mattress',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Regular repositioning/pressure relief',
      importance: 'critical',
      consequence: 'New sores or breakdown of repairs',
      tips: ['Set timers for turning', 'Use pressure mapping if available'],
    },
    {
      requirement: 'Caregiver education and involvement',
      importance: 'critical',
      consequence: 'Prevention fails without caregiver participation',
    },
    {
      requirement: 'Follow sitting protocol exactly',
      importance: 'critical',
      consequence: 'Wound breakdown and surgery failure',
    },
  ],
  
  warningSigns: [
    'New redness over bony areas',
    'Wound reopening',
    'Signs of infection',
    'Pain or tenderness over pressure areas',
  ],
  
  emergencySigns: [
    'Signs of sepsis (fever, confusion, rapid pulse)',
    'Rapidly spreading redness',
    'Exposed bone',
  ],
};

export const prostheticsAmputationEducation: EducationCondition = {
  id: 'prosthetics-amputation',
  name: 'Prosthetics, Amputation Follow-up and Limb Salvage Education',
  description: 'Guide for patients undergoing amputation or limb salvage surgery',
  category: 'Limb Surgery',
  
  overview: {
    definition: 'Amputation is surgical removal of a limb or part of a limb, performed when limb salvage is not possible. Prosthetics are artificial limbs that replace the function of amputated limbs. Limb salvage surgery aims to save a limb that is threatened.',
    causes: [
      'Peripheral vascular disease and gangrene',
      'Diabetes complications',
      'Trauma',
      'Cancer',
      'Severe infection',
      'Burns',
    ],
    riskFactors: [
      'Diabetes',
      'Smoking',
      'Peripheral vascular disease',
      'Chronic kidney disease',
      'Poor nutrition',
    ],
    symptoms: [],
    complications: [
      'Wound healing problems',
      'Infection',
      'Phantom limb pain',
      'Stump revision needed',
      'Psychological adjustment challenges',
    ],
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Pre-amputation Care',
      duration: 'Days to weeks',
      description: 'Planning and preparation for amputation.',
      goals: [
        'Optimize medical condition',
        'Determine appropriate level',
        'Psychological preparation',
        'Rehabilitation planning',
      ],
      activities: [
        'Understand reasons for amputation',
        'Meet prosthetics team if applicable',
        'Psychological support',
        'Stop smoking',
        'Optimize diabetes control',
      ],
    },
    {
      phase: 2,
      name: 'Surgical Phase',
      duration: 'Hours',
      description: 'The amputation surgery.',
      goals: [
        'Remove diseased/injured tissue',
        'Create functional stump',
        'Preserve length when possible',
        'Prepare for prosthesis',
      ],
    },
    {
      phase: 3,
      name: 'Stump Healing',
      duration: '4-8 weeks',
      description: 'Wound healing and stump shaping.',
      goals: [
        'Wound healing',
        'Stump shaping',
        'Pain management',
        'Maintain other limb',
      ],
      interventions: [
        'Wound care',
        'Stump bandaging/shrinker sock',
        'Gentle exercises',
        'Phantom limb pain management',
        'Psychological support',
      ],
      activities: [
        'Keep stump clean and dry',
        'Apply stump bandage/shrinker as taught',
        'Perform stump desensitization exercises',
        'Begin exercises for mobility',
        'Care for remaining limb carefully',
      ],
    },
    {
      phase: 4,
      name: 'Prosthetic Fitting and Training',
      duration: 'Months',
      description: 'Being fitted with and learning to use a prosthesis.',
      goals: [
        'Achieve appropriate stump shape',
        'Be fitted with prosthesis',
        'Learn to use prosthesis',
        'Maximize independence',
      ],
      interventions: [
        'Prosthetic fitting',
        'Gait training',
        'Balance exercises',
        'ADL training',
      ],
      activities: [
        'Attend all prosthetic appointments',
        'Wear prosthesis as directed',
        'Build up wearing time gradually',
        'Report any stump problems',
        'Practice exercises daily',
      ],
    },
  ],
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Leg elevated initially, avoid prolonged hip flexion',
      painManagement: 'Medications for surgical and phantom pain',
      activityLevel: 'Bed rest initially, then wheelchair, then standing',
      expectedSymptoms: [
        'Surgical wound pain',
        'Phantom limb sensations',
        'Phantom limb pain',
        'Swelling',
        'Emotional adjustment',
      ],
    },
    woundCare: [
      {
        day: 'Days 1-14',
        instruction: 'Wound care by nursing staff. Do not disturb dressings.',
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Wound healing, sutures removed. Begin stump shaping.',
      },
    ],
    painManagement: {
      expectedPainLevel: 'Variable. Phantom limb pain is common and can be managed.',
      medications: [
        'Paracetamol and NSAIDs',
        'Gabapentin or pregabalin for nerve/phantom pain',
        'Opioids short-term for severe pain',
      ],
      nonPharmacological: [
        'Mirror therapy for phantom pain',
        'TENS',
        'Desensitization techniques',
        'Psychological support',
      ],
    },
    activityRestrictions: [
      {
        activity: 'Sitting with hip bent',
        restriction: 'Avoid prolonged hip flexion (causes contracture)',
        duration: 'Ongoing',
        reason: 'Prevent hip contracture that limits prosthetic use',
      },
    ],
    dietaryGuidelines: [
      'High-protein diet for healing',
      'Good diabetes control if diabetic',
      'Adequate hydration',
    ],
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '6-8 weeks',
        expectation: 'Stump healed, shaping for prosthesis',
        indicators: ['Wound healed', 'Stump shrinking', 'Mobility in wheelchair'],
      },
    ],
    longTerm: [
      {
        timeframe: '6-12 months',
        expectation: 'Walking with prosthesis, maximum independence',
        indicators: ['Independent ambulation', 'Return to activities'],
      },
    ],
    functionalRecovery: 'Most amputees achieve good mobility with prosthesis. Upper limb prosthetics provide functional help but natural hand function cannot be replicated.',
    possibleComplications: [
      'Stump breakdown',
      'Chronic phantom pain',
      'Prosthetic fit problems',
      'Amputation of other limb (vascular patients)',
    ],
  },
  
  followUpCare: {
    schedule: [
      { timing: '1-2 weeks', purpose: 'Wound check' },
      { timing: '6 weeks', purpose: 'Assess for prosthetic fitting' },
      { timing: 'Ongoing', purpose: 'Prosthetic adjustments, stump monitoring' },
    ],
    rehabilitationNeeds: [
      'Physiotherapy for strength and mobility',
      'Prosthetic training',
      'Occupational therapy',
      'Psychological support',
    ],
    lifestyleModifications: [
      'Daily stump care and inspection',
      'Protect remaining limb carefully',
      'Diabetes control',
      'No smoking',
      'Regular prosthetic check-ups',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Stump shaping and care',
      importance: 'critical',
      consequence: 'Poor prosthetic fit',
    },
    {
      requirement: 'Physiotherapy and exercises',
      importance: 'critical',
      consequence: 'Contractures and poor mobility',
    },
    {
      requirement: 'Care of remaining limb',
      importance: 'critical',
      consequence: 'Risk of second amputation',
    },
  ],
  
  warningSigns: [
    'Stump wound not healing',
    'Signs of infection',
    'Severe phantom pain not controlled',
    'Problems with remaining limb',
  ],
  
  emergencySigns: [
    'Stump wound breakdown',
    'Signs of infection in remaining limb',
    'Severe depression or suicidal thoughts',
  ],
};

export const minorProceduresEducation: EducationCondition = {
  id: 'minor-procedures',
  name: 'Minor Procedures - Keloid Excision, Ingrown Toenail, Lipoma Removal',
  description: 'Guide for patients undergoing minor surgical procedures',
  category: 'Minor Surgery',
  
  overview: {
    definition: 'Minor procedures are surgeries performed under local anaesthesia, usually in an outpatient setting with same-day discharge. Common examples include removal of skin lumps, ingrown toenail surgery, and small scar revisions.',
    causes: [],
    riskFactors: [
      'Smoking (delays healing)',
      'Diabetes (infection and healing risk)',
      'Blood thinners (bleeding)',
      'Previous keloid formation',
    ],
    symptoms: [],
    complications: [
      'Bleeding',
      'Infection',
      'Scarring',
      'Keloid formation (especially in predisposed individuals)',
      'Recurrence',
    ],
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Pre-operative Preparation',
      duration: 'Days to weeks',
      description: 'Simple preparation for minor surgery.',
      goals: [
        'Confirm procedure and consent',
        'Review medications',
        'Ensure health optimized',
      ],
      activities: [
        'Stop blood thinners if advised',
        'Do not apply creams to area on surgery day',
        'Eat a light meal before (not fasting for local anaesthesia)',
        'Arrange transport home',
      ],
    },
    {
      phase: 2,
      name: 'Procedure',
      duration: '15-60 minutes',
      description: 'The minor surgical procedure.',
      goals: [
        'Local anaesthesia for comfort',
        'Complete excision/repair',
        'Wound closure',
      ],
      interventions: [
        'Local anaesthetic injection',
        'Surgical excision or repair',
        'Wound closure (sutures, glue, or dressing)',
        'Pressure dressing if needed',
      ],
    },
    {
      phase: 3,
      name: 'Recovery',
      duration: '1-2 weeks',
      description: 'Healing after minor surgery.',
      goals: [
        'Wound healing',
        'Prevent infection',
        'Minimize scarring',
      ],
      activities: [
        'Keep wound clean and dry for 24-48 hours',
        'Avoid strenuous activity for 1-2 weeks',
        'Take simple pain relief as needed',
        'Watch for signs of infection',
        'Return for suture removal as instructed',
      ],
    },
  ],
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Elevate affected area if possible',
      painManagement: 'Paracetamol usually sufficient',
      activityLevel: 'Light activity, avoid stress on wound',
      expectedSymptoms: [
        'Numbness from local anaesthesia (wears off in hours)',
        'Mild pain once anaesthesia wears off',
        'Slight oozing through dressing',
        'Mild swelling',
      ],
    },
    woundCare: [
      {
        day: 'Days 1-2',
        instruction: 'Keep dressing dry and intact. No bathing area.',
      },
      {
        day: 'Days 2-7',
        instruction: 'Keep wound clean, may shower but pat dry gently.',
      },
      {
        day: 'Day 7-14',
        instruction: 'Suture removal. Begin scar care after 2-3 weeks.',
      },
    ],
    painManagement: {
      expectedPainLevel: 'Mild, easily controlled.',
      medications: ['Paracetamol', 'Ibuprofen if needed'],
      nonPharmacological: ['Elevation', 'Rest'],
    },
    activityRestrictions: [
      {
        activity: 'Strenuous exercise',
        restriction: 'Avoid',
        duration: '1-2 weeks',
        reason: 'Prevent wound stress and bleeding',
      },
      {
        activity: 'Swimming/bathing',
        restriction: 'Keep wound dry',
        duration: 'Until fully healed (2 weeks)',
        reason: 'Prevent infection',
      },
    ],
    dietaryGuidelines: ['No specific restrictions'],
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1-2 weeks',
        expectation: 'Wound healed',
        indicators: ['Sutures removed', 'No infection'],
      },
    ],
    longTerm: [
      {
        timeframe: '3-12 months',
        expectation: 'Scar matured',
        indicators: ['Flat pale scar', 'No recurrence'],
      },
    ],
    functionalRecovery: 'Full recovery expected within 2 weeks for most procedures.',
    cosmeticOutcome: 'Small scar expected. Usually fades well but never disappears completely.',
  },
  
  followUpCare: {
    schedule: [
      { timing: '7-14 days', purpose: 'Suture removal' },
      { timing: 'As needed', purpose: 'Review if concerns' },
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Keep wound clean and dry',
      importance: 'important',
      consequence: 'Infection',
    },
    {
      requirement: 'Return for suture removal',
      importance: 'important',
      consequence: 'Scarring, suture marks',
    },
  ],
  
  warningSigns: [
    'Increasing pain after initial improvement',
    'Redness spreading from wound',
    'Pus or discharge',
    'Fever',
    'Wound opening',
  ],
  
  emergencySigns: [
    'Severe bleeding not stopping with pressure',
    'Signs of severe infection',
    'Allergic reaction to medications',
  ],
};

export const painManagementEducation: EducationCondition = {
  id: 'pain-management',
  name: 'Pain Management, Opioid Safety and Alternatives',
  description: 'Guide to safe and effective pain management after surgery',
  category: 'Supportive Care',
  
  overview: {
    definition: 'Post-operative pain is expected and can be managed safely with a combination of medications and non-drug approaches. Understanding how to use pain medications safely is essential for recovery.',
    causes: [
      'Surgical tissue trauma',
      'Inflammation',
      'Nerve involvement',
      'Muscle spasm',
    ],
    riskFactors: [
      'Previous chronic pain conditions',
      'Anxiety',
      'Previous opioid use',
      'Large or complex surgery',
    ],
    symptoms: [],
    complications: [
      'Opioid side effects (constipation, nausea, drowsiness)',
      'Respiratory depression (with overdose)',
      'Dependence with prolonged use',
      'Inadequate pain control affecting recovery',
    ],
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Acute Post-operative Period',
      duration: 'Days 1-3',
      description: 'Pain is typically worst in the first few days.',
      goals: [
        'Adequate pain control for comfort',
        'Enable early mobilization',
        'Prevent complications',
      ],
      interventions: [
        'Regular paracetamol (foundation of pain management)',
        'NSAIDs if not contraindicated',
        'Opioids for moderate to severe pain',
        'Non-drug measures',
      ],
      activities: [
        'Take paracetamol regularly, not just when pain is severe',
        'Report pain honestly - rate it 0-10',
        'Use opioids only when needed for breakthrough pain',
        'Try non-drug measures alongside medications',
      ],
    },
    {
      phase: 2,
      name: 'Recovery Phase',
      duration: 'Weeks 1-2',
      description: 'Pain gradually decreasing.',
      goals: [
        'Wean off stronger medications',
        'Transition to non-opioid pain relief',
        'Maintain function',
      ],
      activities: [
        'Reduce opioid use as pain improves',
        'Continue paracetamol regularly if needed',
        'Increase use of non-drug measures',
        'Do not suddenly stop opioids if used for more than a week',
      ],
    },
  ],
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Position of comfort, elevate surgical area if applicable',
      painManagement: 'Multi-modal approach combining different types of pain relief',
      activityLevel: 'Movement helps prevent complications and can reduce pain',
      expectedSymptoms: [
        'Pain at surgical site',
        'Pain with movement initially',
        'Gradual improvement over days',
      ],
    },
    woundCare: [],
    painManagement: {
      expectedPainLevel: 'Moderate to severe initially, decreasing over days to weeks.',
      medications: [
        'Paracetamol: 1g every 6 hours (adult dose) - take REGULARLY',
        'NSAIDs (ibuprofen, diclofenac): take with food, avoid if kidney problems, ulcers, or on blood thinners',
        'Tramadol: 50-100mg every 6 hours as needed for moderate-severe pain',
        'Codeine or morphine: for severe pain only, as prescribed',
      ],
      nonPharmacological: [
        'Ice packs (20 minutes on, 20 off) in first 48 hours',
        'Elevation of affected area',
        'Gentle movement and positioning',
        'Distraction (music, TV, conversation)',
        'Deep breathing and relaxation',
        'Heat therapy (after 48 hours for muscle pain)',
        'Physiotherapy exercises',
      ],
      whenToSeekHelp: 'If pain is not controlled by prescribed medications, if pain suddenly worsens, or if you develop new symptoms.',
    },
    activityRestrictions: [],
    dietaryGuidelines: [
      'Eat high-fibre foods to prevent constipation from opioids',
      'Drink plenty of water',
      'Take medications with food to prevent stomach upset',
    ],
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1-2 weeks',
        expectation: 'Pain significantly improved, off opioids or minimal use',
        indicators: ['Comfortable with simple painkillers', 'Sleeping well', 'Moving comfortably'],
      },
    ],
    longTerm: [
      {
        timeframe: '4-8 weeks',
        expectation: 'Pain resolved or minimal',
        indicators: ['No regular pain medication needed', 'Full activities resumed'],
      },
    ],
    functionalRecovery: 'Adequate pain control is essential for rehabilitation and return to function.',
  },
  
  followUpCare: {
    schedule: [
      { timing: 'As scheduled', purpose: 'Review pain levels' },
    ],
    ongoingMonitoring: [
      'Track pain levels',
      'Monitor medication use',
      'Watch for side effects',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Take paracetamol regularly, not just when in pain',
      importance: 'important',
      consequence: 'Poor pain control',
      tips: ['Set alarms for medication times', 'Keep medications accessible'],
    },
    {
      requirement: 'Use opioids only as prescribed',
      importance: 'critical',
      consequence: 'Side effects, dependence, respiratory depression',
      tips: ['Never take more than prescribed', 'Do not share medications', 'Store safely away from children'],
    },
    {
      requirement: 'Wean off opioids as pain improves',
      importance: 'important',
      consequence: 'Prolonged use increases dependence risk',
      tips: ['Aim to stop opioids within 1-2 weeks', 'Reduce dose gradually'],
    },
  ],
  
  warningSigns: [
    'Pain not controlled despite taking medications',
    'Sudden worsening of pain',
    'Severe constipation',
    'Excessive drowsiness or confusion',
    'Nausea and vomiting preventing oral intake',
  ],
  
  emergencySigns: [
    'Severe difficulty breathing (opioid overdose)',
    'Unrousable drowsiness',
    'Severe allergic reaction',
    'Sudden severe pain suggesting complication',
  ],
};

export const nutritionDiabetesEducation: EducationCondition = {
  id: 'nutrition-diabetes-healing',
  name: 'Nutrition, Diabetes and Wound Healing',
  description: 'Essential nutrition information for optimal wound healing',
  category: 'Supportive Care',
  
  overview: {
    definition: 'Proper nutrition is essential for wound healing. The body requires extra energy, protein, and micronutrients during healing. For diabetic patients, blood sugar control is critical for preventing complications.',
    causes: [],
    riskFactors: [
      'Malnutrition or underweight',
      'Obesity',
      'Diabetes with poor control',
      'Chronic illness',
      'Alcohol use',
      'Poverty limiting food access',
    ],
    symptoms: [
      'Slow wound healing',
      'Wound breakdown',
      'Increased infection risk',
      'Poor surgical outcomes',
    ],
    complications: [
      'Wound dehiscence',
      'Surgical site infection',
      'Graft or flap failure',
      'Prolonged recovery',
    ],
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Pre-operative Optimization',
      duration: 'Before surgery',
      description: 'Optimizing nutrition before surgery for best outcomes.',
      goals: [
        'Achieve adequate nutritional status',
        'Control blood sugars (HbA1c <8% ideally)',
        'Address deficiencies',
      ],
      activities: [
        'Eat balanced meals with protein at every meal',
        'Take prescribed vitamins if deficient',
        'Achieve good blood sugar control',
        'Avoid fasting diets before surgery',
        'Stop alcohol',
      ],
    },
    {
      phase: 2,
      name: 'Post-operative Healing Phase',
      duration: 'Weeks to months',
      description: 'Supporting wound healing with optimal nutrition.',
      goals: [
        'Provide extra energy and protein for healing',
        'Ensure adequate micronutrients',
        'Maintain blood sugar control',
      ],
      activities: [
        'Eat 1.5-2g protein per kg body weight daily',
        'Eat small frequent meals if appetite is poor',
        'Include protein at every meal and snack',
        'Take supplements if prescribed',
        'Monitor and control blood sugars carefully',
      ],
    },
  ],
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'N/A',
      painManagement: 'N/A',
      activityLevel: 'N/A',
      expectedSymptoms: ['Reduced appetite is common after surgery'],
    },
    woundCare: [],
    painManagement: {
      expectedPainLevel: 'N/A',
      medications: [],
      nonPharmacological: [],
    },
    activityRestrictions: [],
    dietaryGuidelines: [
      'PROTEIN: Essential for healing. 1.5-2g per kg body weight daily',
      'Protein sources: eggs, fish, chicken, beef, beans, groundnuts, milk, cheese, soya',
      'Include protein at EVERY meal: breakfast egg, lunch beans, dinner fish',
      'CALORIES: Extra energy needed for healing - eat regularly even if appetite is poor',
      'VITAMIN C: For collagen formation - citrus fruits, tomatoes, peppers, guava, pawpaw',
      'VITAMIN A: For skin integrity - dark green vegetables, carrots, palm oil, liver',
      'ZINC: For wound healing - meat, shellfish, legumes, seeds, nuts',
      'IRON: For oxygen delivery - meat, beans, dark leafy vegetables',
      'WATER: Stay well hydrated - at least 2 litres daily',
      '',
      'LOCAL NIGERIAN FOODS FOR HEALING:',
      '- Egusi soup with fish/meat (protein, zinc)',
      '- Beans and plantain (protein, calories)',
      '- Moi-moi (protein)',
      '- Fish pepper soup (protein, fluids)',
      '- Okra soup with goat meat (protein, vitamins)',
      '- Fruits: oranges, pawpaw, guava, mangoes (vitamin C)',
      '- Vegetables: ugwu, spinach, bitter leaf (vitamins, iron)',
      '- Eggs (cheap, complete protein)',
      '- Groundnuts and groundnut soup (protein, calories)',
      '',
      'FOR DIABETIC PATIENTS:',
      '- Monitor blood sugar at least twice daily during wound healing',
      '- Target blood sugar 6-10 mmol/L',
      '- Take diabetes medications as prescribed',
      '- Avoid sugary drinks and excessive carbohydrates',
      '- Do not skip meals',
      '- Report blood sugars consistently above 15 or below 4',
    ],
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: 'During healing',
        expectation: 'Adequate nutrition supports optimal wound healing',
        indicators: ['Wounds healing on schedule', 'Blood sugars in target range'],
      },
    ],
    longTerm: [],
    functionalRecovery: 'Good nutrition supports faster recovery and fewer complications.',
  },
  
  followUpCare: {
    schedule: [],
    ongoingMonitoring: [
      'Weight monitoring',
      'Blood sugar monitoring for diabetics',
      'Wound healing progress',
    ],
    lifestyleModifications: [
      'Maintain balanced diet long-term',
      'Control diabetes carefully',
      'Consider nutrition counselling if struggling',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Adequate protein intake',
      importance: 'critical',
      consequence: 'Delayed healing, wound complications',
      tips: ['Include protein at every meal', 'Keep protein snacks available'],
    },
    {
      requirement: 'Blood sugar control for diabetics',
      importance: 'critical',
      consequence: 'Wound infections, healing failure',
      tips: ['Monitor regularly', 'Take medications as prescribed', 'Report high sugars'],
    },
  ],
  
  warningSigns: [
    'Wound not healing as expected',
    'Blood sugars consistently elevated',
    'Losing weight unintentionally',
    'Unable to eat',
  ],
  
  emergencySigns: [
    'Blood sugar very high (>20) or very low (<3)',
    'Unable to eat or drink for >24 hours',
  ],
};

export const infectionPreventionEducation: EducationCondition = {
  id: 'infection-prevention',
  name: 'Infection Prevention, Tetanus and Immunisation',
  description: 'Guide to preventing wound infections and ensuring immunisation',
  category: 'Supportive Care',
  
  overview: {
    definition: 'Preventing infection is essential for surgical wound healing. This includes proper wound care, hygiene, completing antibiotic courses when prescribed, and ensuring tetanus immunisation is up to date.',
    causes: [
      'Bacteria entering wounds',
      'Poor wound care',
      'Touching wounds with dirty hands',
      'Contaminated dressings',
      'Poor general hygiene',
    ],
    riskFactors: [
      'Diabetes',
      'Malnutrition',
      'Immunosuppression',
      'Dirty or contaminated wounds',
      'Delayed treatment',
      'Poor blood supply',
    ],
    symptoms: [
      'Increasing redness around wound',
      'Warmth and swelling',
      'Pus or discharge',
      'Foul smell',
      'Fever',
      'Increasing pain',
    ],
    complications: [
      'Wound infection',
      'Cellulitis',
      'Abscess formation',
      'Tetanus (from contaminated wounds)',
      'Sepsis',
    ],
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Prevention',
      duration: 'Ongoing',
      description: 'Measures to prevent wound infection.',
      goals: [
        'Keep wound clean',
        'Prevent contamination',
        'Optimize healing conditions',
      ],
      activities: [
        'WASH HANDS thoroughly before and after wound care',
        'Keep wound clean and dry',
        'Change dressings as instructed using clean technique',
        'Use clean water and sterile dressings',
        'Do not touch wound directly',
        'Do not apply traditional remedies or substances',
        'Complete any prescribed antibiotic course',
        'Ensure tetanus vaccination is up to date',
      ],
    },
    {
      phase: 2,
      name: 'Tetanus Prevention',
      duration: 'At time of injury and ongoing',
      description: 'Ensuring protection against tetanus.',
      goals: [
        'Prevent tetanus infection',
        'Maintain immunity',
      ],
      activities: [
        'Know your tetanus vaccination status',
        'Ensure booster given if indicated for wound',
        'Keep vaccination record',
        'Get booster every 10 years',
      ],
    },
  ],
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'N/A',
      painManagement: 'N/A',
      activityLevel: 'N/A',
      expectedSymptoms: ['Mild redness immediately around wound is normal and will settle'],
    },
    woundCare: [
      {
        day: 'All days',
        instruction: 'Wash hands before touching wound. Use clean technique for dressings.',
      },
    ],
    painManagement: {
      expectedPainLevel: 'N/A',
      medications: [],
      nonPharmacological: [],
    },
    activityRestrictions: [],
    dietaryGuidelines: [
      'Good nutrition supports immune function',
      'Stay well hydrated',
    ],
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: 'During healing',
        expectation: 'Wound heals without infection',
        indicators: ['No signs of infection', 'Wound closing normally'],
      },
    ],
    longTerm: [],
    functionalRecovery: 'Preventing infection allows wounds to heal optimally.',
  },
  
  followUpCare: {
    schedule: [],
    ongoingMonitoring: [
      'Daily wound inspection for infection signs',
      'Temperature monitoring',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Complete prescribed antibiotic course',
      importance: 'critical',
      consequence: 'Incomplete treatment leads to resistant bacteria and treatment failure',
      tips: ['Finish all tablets even if feeling better', 'Set reminders'],
    },
    {
      requirement: 'Proper hand hygiene',
      importance: 'critical',
      consequence: 'Wound contamination and infection',
      tips: ['Wash with soap for 20 seconds', 'Wash before AND after wound care'],
    },
    {
      requirement: 'Tetanus vaccination',
      importance: 'critical',
      consequence: 'Tetanus is a severe, often fatal infection',
      tips: ['Get booster at time of injury if >5 years since last', 'Keep record of vaccinations'],
    },
  ],
  
  warningSigns: [
    'Spreading redness from wound',
    'Increasing pain',
    'Pus or foul-smelling discharge',
    'Fever',
    'Red streaks from wound (lymphangitis)',
  ],
  
  emergencySigns: [
    'High fever with chills',
    'Rapidly spreading redness',
    'Confusion or feeling very unwell',
    'Jaw stiffness or muscle spasms (tetanus)',
  ],
};

export const culturalPsychosocialEducation: EducationCondition = {
  id: 'cultural-psychosocial',
  name: 'Cultural, Financial and Psychosocial Issues - Nigerian Context',
  description: 'Addressing cultural factors, costs, and psychological impact of surgery',
  category: 'Supportive Care',
  
  overview: {
    definition: 'Healthcare does not exist in isolation. Cultural beliefs, financial constraints, and psychological impact all affect surgical care and outcomes. This section addresses these issues relevant to the Nigerian context.',
    causes: [],
    riskFactors: [],
    symptoms: [],
    complications: [],
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Traditional Remedies and Practices',
      duration: 'Pre-admission discussion',
      description: 'Addressing the use of traditional treatments.',
      goals: [
        'Understand patient beliefs respectfully',
        'Explain risks of harmful practices',
        'Negotiate safe care plan',
      ],
      activities: [
        'Tell your doctor about any traditional treatments used',
        'Stop applying substances to wounds before surgery',
        'Understand that some traditional treatments can harm wounds',
        'Continue safe cultural practices that do not affect wounds',
        'Discuss concerns openly with healthcare team',
      ],
    },
    {
      phase: 2,
      name: 'Financial Planning',
      duration: 'Before and during treatment',
      description: 'Managing the costs of surgical care.',
      goals: [
        'Understand expected costs',
        'Identify payment options',
        'Prevent financial barriers to care',
      ],
      activities: [
        'Ask for cost estimates before surgery',
        'Inquire about payment plans if needed',
        'Check insurance coverage if applicable',
        'Ask about social welfare support if struggling',
        'Do not delay essential care due to cost - discuss with hospital',
        'Be honest about financial constraints',
      ],
    },
    {
      phase: 3,
      name: 'Psychological Support',
      duration: 'Throughout and beyond treatment',
      description: 'Addressing the emotional impact of surgery and disfigurement.',
      goals: [
        'Recognize psychological distress',
        'Provide support and counselling',
        'Address stigma',
        'Facilitate social reintegration',
      ],
      activities: [
        'Talk about your feelings - it is normal to feel distressed',
        'Accept support from family and friends',
        'Ask for counselling if struggling',
        'Join support groups if available',
        'Report depression or suicidal thoughts immediately',
        'Be patient with yourself - adjustment takes time',
        'Focus on function and quality of life, not just appearance',
      ],
    },
    {
      phase: 4,
      name: 'Prevention Education',
      duration: 'For household and community',
      description: 'Preventing future injuries.',
      goals: [
        'Prevent burns and trauma',
        'Educate family and community',
      ],
      activities: [
        'BURN PREVENTION:',
        '- Keep children away from cooking areas',
        '- Test bath water temperature before bathing children',
        '- Store kerosene and petrol safely away from heat',
        '- Never leave cooking unattended',
        '- Turn pot handles inward on stoves',
        '- Keep matches and lighters out of children\'s reach',
        '- Have a fire escape plan for your home',
        '',
        'ROAD TRAFFIC ACCIDENT PREVENTION:',
        '- Wear seat belts',
        '- Wear helmets on motorcycles',
        '- Do not drink and drive',
        '- Follow traffic rules',
        '',
        'WORKPLACE SAFETY:',
        '- Use protective equipment',
        '- Follow safety procedures',
        '- Report unsafe conditions',
      ],
    },
  ],
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'N/A',
      painManagement: 'N/A',
      activityLevel: 'N/A',
      expectedSymptoms: [],
    },
    woundCare: [],
    painManagement: {
      expectedPainLevel: 'N/A',
      medications: [],
      nonPharmacological: [],
    },
    activityRestrictions: [],
    dietaryGuidelines: [],
  },
  
  expectedOutcomes: {
    shortTerm: [],
    longTerm: [],
    functionalRecovery: 'Addressing these issues improves overall outcomes and quality of life.',
  },
  
  followUpCare: {
    schedule: [],
    supportServices: [
      'Hospital social work department',
      'Psychological counselling services',
      'Support groups for burn survivors and others',
      'Community reintegration programs',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Disclose use of traditional remedies',
      importance: 'important',
      consequence: 'Some may interfere with treatment or delay healing',
    },
    {
      requirement: 'Seek help for psychological distress',
      importance: 'critical',
      consequence: 'Untreated depression affects recovery and quality of life',
    },
    {
      requirement: 'Implement prevention measures at home',
      importance: 'important',
      consequence: 'Prevent future injuries to self and family',
    },
  ],
  
  warningSigns: [
    'Feeling persistently sad or hopeless',
    'Losing interest in activities',
    'Not eating or sleeping',
    'Social withdrawal',
    'Thoughts of self-harm',
  ],
  
  emergencySigns: [
    'Thoughts of suicide or self-harm - seek help immediately',
    'Severe psychological distress affecting ability to function',
  ],
};

export const followUpPlanEducation: EducationCondition = {
  id: 'follow-up-plan',
  name: 'Follow-up Plan, Rehabilitation and Long-term Expectations',
  description: 'Understanding the follow-up journey after surgery',
  category: 'Supportive Care',
  
  overview: {
    definition: 'Recovery from surgery is a journey that continues long after discharge. Understanding what to expect, when to return for follow-up, and the possibility of further procedures helps patients navigate recovery successfully.',
    causes: [],
    riskFactors: [],
    symptoms: [],
    complications: [],
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Immediate Follow-up',
      duration: '1-4 weeks post-surgery',
      description: 'Initial clinic reviews after surgery.',
      goals: [
        'Wound check',
        'Suture removal',
        'Drain removal if applicable',
        'Early complication detection',
      ],
      activities: [
        'Attend all scheduled appointments',
        'Bring list of questions and concerns',
        'Report any problems',
        'Understand ongoing care instructions',
      ],
    },
    {
      phase: 2,
      name: 'Rehabilitation Phase',
      duration: 'Weeks to months',
      description: 'Active recovery and therapy.',
      goals: [
        'Maximize function',
        'Manage scars',
        'Address complications if any',
        'Psychological adjustment',
      ],
      activities: [
        'Attend physiotherapy as scheduled',
        'Perform home exercises daily',
        'Wear pressure garments if prescribed',
        'Continue scar management',
        'Attend support groups if available',
      ],
    },
    {
      phase: 3,
      name: 'Long-term Follow-up',
      duration: 'Months to years',
      description: 'Ongoing monitoring and planning for any further procedures.',
      goals: [
        'Monitor long-term outcome',
        'Plan staged procedures if needed',
        'Address late complications',
        'Optimize final result',
      ],
      activities: [
        'Attend annual reviews if recommended',
        'Report any new concerns',
        'Discuss any desired improvements',
        'Maintain preventive measures',
      ],
    },
  ],
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'N/A',
      painManagement: 'N/A',
      activityLevel: 'N/A',
      expectedSymptoms: [],
    },
    woundCare: [],
    painManagement: {
      expectedPainLevel: 'N/A',
      medications: [],
      nonPharmacological: [],
    },
    activityRestrictions: [],
    dietaryGuidelines: [],
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '6-8 weeks',
        expectation: 'Initial healing complete, function improving',
        indicators: ['Wounds healed', 'Activities increasing'],
      },
    ],
    longTerm: [
      {
        timeframe: '6-12 months',
        expectation: 'Scar maturation, maximum function achieved',
        indicators: ['Scars soft and fading', 'Function optimized'],
      },
      {
        timeframe: '1-2 years',
        expectation: 'Final result, consider any revisions if desired',
        indicators: ['Stable outcome', 'Adjusted psychologically'],
      },
    ],
    functionalRecovery: 'Full recovery may take months to years depending on the surgery. Patience and persistence are key.',
    cosmeticOutcome: 'Scars continue improving for 12-18 months. Revision surgery is possible after full maturation.',
  },
  
  followUpCare: {
    schedule: [
      { timing: '1-2 weeks', purpose: 'Wound check, suture/drain removal' },
      { timing: '4-6 weeks', purpose: 'Assess healing, physiotherapy progress' },
      { timing: '3 months', purpose: 'Evaluate outcome, address concerns' },
      { timing: '6 months', purpose: 'Scar assessment, function review' },
      { timing: '12 months', purpose: 'Final outcome, discuss any revisions' },
      { timing: 'Annually or as needed', purpose: 'Long-term monitoring' },
    ],
    rehabilitationNeeds: [
      'Physiotherapy (frequency depends on surgery)',
      'Occupational therapy if needed',
      'Pressure therapy for scars',
      'Psychological support',
    ],
    longTermConsiderations: [
      'Some scars may need revision after 1 year',
      'Function may continue improving for 1-2 years',
      'Staged reconstructions are common and planned',
      'Life changes may require additional procedures',
      'Long-term support is available',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Attend all follow-up appointments',
      importance: 'critical',
      consequence: 'Missed complications, suboptimal outcomes',
      tips: ['Put dates in calendar immediately', 'Arrange transport in advance'],
    },
    {
      requirement: 'Complete rehabilitation program',
      importance: 'critical',
      consequence: 'Poor functional outcome',
      tips: ['Make therapy part of daily routine', 'Track progress to stay motivated'],
    },
    {
      requirement: 'Report concerns early',
      importance: 'important',
      consequence: 'Delayed treatment of problems',
      tips: ['Keep contact numbers accessible', 'Do not wait and see for worrying symptoms'],
    },
  ],
  
  warningSigns: [
    'Wound problems developing after apparent healing',
    'Function deteriorating',
    'Scars thickening or tightening',
    'Psychological distress',
    'New symptoms in operated area',
  ],
  
  emergencySigns: [
    'Late signs of infection',
    'Sudden pain or swelling',
    'Thoughts of self-harm',
  ],
};

// Export all supportive care education
export const supportiveCareEducationList: EducationCondition[] = [
  pressureSoreEducation,
  prostheticsAmputationEducation,
  minorProceduresEducation,
  painManagementEducation,
  nutritionDiabetesEducation,
  infectionPreventionEducation,
  culturalPsychosocialEducation,
  followUpPlanEducation,
];
