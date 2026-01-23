/**
 * Burn Wound Debridement, Skin Grafting and Graft Care Education
 * Dr Nnadi-Burns Plastic and Reconstructive Surgery Services
 */

import type { EducationCondition } from '../types';

export const burnGraftingEducation: EducationCondition = {
  id: 'burn-grafting-care',
  name: 'Burn Wound Debridement, Skin Grafting and Graft Care',
  description: 'Comprehensive guide for patients undergoing surgical treatment for burn wounds',
  category: 'Burns',
  
  overview: {
    definition: 'Skin grafting is a surgical procedure where healthy skin is taken from one part of the body (donor site) and transplanted to cover a burn wound. Debridement is the removal of dead, damaged, or infected tissue to promote healing.',
    causes: [
      'Deep partial thickness burns (deep second degree)',
      'Full thickness burns (third degree)',
      'Burns that fail to heal with conservative treatment',
    ],
    riskFactors: [
      'Smoking (reduces graft survival)',
      'Diabetes (impairs healing)',
      'Poor nutrition',
      'Infection',
      'Large burn surface area',
      'Advanced age',
    ],
    symptoms: [],
    complications: [
      'Graft failure (partial or complete)',
      'Infection at graft or donor site',
      'Haematoma or seroma under graft',
      'Delayed healing of donor site',
      'Scarring at both sites',
    ],
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Surgical Debridement',
      duration: '1-2 hours (procedure)',
      description: 'Removal of dead and damaged tissue to create a clean wound bed for grafting.',
      goals: [
        'Remove all non-viable tissue',
        'Control bleeding',
        'Reduce bacterial load',
        'Prepare wound bed for grafting',
      ],
      interventions: [
        'General or regional anaesthesia',
        'Tangential or fascial excision of burn eschar',
        'Haemostasis (stopping bleeding)',
        'Temporary or definitive wound coverage',
      ],
    },
    {
      phase: 2,
      name: 'Skin Grafting Procedure',
      duration: '1-3 hours',
      description: 'Harvesting skin from a healthy area and applying it to the prepared wound.',
      goals: [
        'Harvest adequate skin for coverage',
        'Achieve secure graft placement',
        'Minimize donor site morbidity',
      ],
      interventions: [
        'Split-thickness skin graft (STSG) harvesting from thigh, buttock, or scalp',
        'Meshing graft if needed to cover larger areas',
        'Securing graft with sutures, staples, or dressings',
        'Applying tie-over or bolster dressing',
      ],
    },
    {
      phase: 3,
      name: 'Graft Stabilization',
      duration: 'Days 1-7 post-surgery',
      description: 'Critical period for graft survival - absolute immobilization required.',
      goals: [
        'Prevent graft displacement',
        'Allow vascular ingrowth (graft "taking")',
        'Prevent infection',
        'Manage donor site healing',
      ],
      interventions: [
        'Strict immobilization of grafted area',
        'First dressing inspection at day 5',
        'Donor site dressing care',
        'Pain management',
        'Nutritional support',
      ],
      activities: [
        'Keep grafted limb absolutely still',
        'Maintain prescribed position',
        'Report any unusual pain, smell, or discharge',
        'Eat high-protein diet',
        'Stay hydrated',
      ],
      warningSignsThisPhase: [
        'Fever',
        'Increasing pain',
        'Foul odour from dressings',
        'Bleeding through dressings',
        'Graft appearing dark or discoloured',
      ],
    },
    {
      phase: 4,
      name: 'Graft Maturation',
      duration: 'Weeks 2-6',
      description: 'Progressive healing and integration of the graft.',
      goals: [
        'Complete graft take',
        'Donor site healing',
        'Begin mobilization',
        'Start scar management',
      ],
      activities: [
        'Gentle dressing changes',
        'Progressive mobilization as allowed',
        'Moisturizing grafted skin',
        'Sun protection',
        'Begin physiotherapy',
      ],
    },
  ],
  
  preoperativeInstructions: {
    consultations: [
      'Surgical planning with burns surgeon',
      'Anaesthesia assessment',
      'Nutritional assessment',
    ],
    investigations: [
      'Full blood count',
      'Blood group and crossmatch',
      'Wound swab culture',
      'Electrolytes and kidney function',
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'Stop as directed before surgery',
        reason: 'Reduce bleeding risk',
      },
    ],
    dietaryRestrictions: ['Fasting as per anaesthesia guidelines'],
    dayBeforeSurgery: [
      'Shower with antiseptic soap',
      'Rest well',
      'Avoid alcohol',
    ],
    dayOfSurgery: [
      'Nothing to eat or drink',
      'Wear comfortable loose clothing',
    ],
    fastingInstructions: 'No food for 6 hours, no fluids for 2 hours before surgery.',
  },
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Grafted area elevated and immobilized as directed',
      painManagement: 'Regular pain medication - donor site is often more painful than graft site',
      activityLevel: 'Strict bed rest for grafted limb for 5-7 days',
      expectedSymptoms: [
        'Pain at donor site (like a graze)',
        'Throbbing sensation at graft site',
        'Swelling and oozing',
        'Itching as healing progresses',
      ],
    },
    woundCare: [
      {
        day: 'Days 1-5',
        instruction: 'DO NOT disturb graft dressing. Keep immobilized.',
        dressingType: 'Tie-over or bolster dressing',
      },
      {
        day: 'Day 5-7',
        instruction: 'First graft inspection by surgeon. Assess graft take.',
        dressingType: 'Non-adherent dressing applied',
      },
      {
        day: 'Weeks 2-3',
        instruction: 'Regular dressing changes. Gentle wound care.',
        frequency: 'Every 2-3 days',
      },
      {
        day: 'Week 3+',
        instruction: 'Open wound care. Moisturize grafted skin.',
        frequency: 'Daily moisturizing',
      },
    ],
    painManagement: {
      expectedPainLevel: 'Donor site pain is often significant for 1-2 weeks. Graft site pain is usually less.',
      medications: [
        'Paracetamol regularly',
        'NSAIDs with food',
        'Opioids for severe pain',
      ],
      nonPharmacological: [
        'Cool air on donor site',
        'Elevation',
        'Distraction',
      ],
    },
    activityRestrictions: [
      {
        activity: 'Movement of grafted limb',
        restriction: 'Absolute rest',
        duration: '5-7 days minimum',
        reason: 'Shear forces cause graft failure',
      },
      {
        activity: 'Walking (lower limb grafts)',
        restriction: 'Non-weight bearing',
        duration: '2-3 weeks',
        reason: 'Pressure can damage grafts',
      },
      {
        activity: 'Showering',
        restriction: 'Keep graft dry',
        duration: 'Until cleared by surgeon',
        reason: 'Water can dislodge healing grafts',
      },
    ],
    dietaryGuidelines: [
      'High-protein diet (1.5-2g protein/kg body weight)',
      'Extra calories for healing',
      'Vitamin C and Zinc supplements',
      'Adequate hydration',
    ],
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1 week',
        expectation: 'Graft "taking" begins, becomes pink and adherent',
        indicators: ['Graft has pink colour', 'No separation from wound bed', 'No infection'],
      },
      {
        timeframe: '2-3 weeks',
        expectation: 'Graft fully integrated, donor site healing',
        indicators: ['Graft stable', 'Donor site re-epithelializing'],
      },
    ],
    longTerm: [
      {
        timeframe: '3-6 months',
        expectation: 'Graft maturing, pigment changes settling',
        indicators: ['Colour stabilizing', 'Texture improving'],
      },
      {
        timeframe: '1-2 years',
        expectation: 'Final appearance achieved',
        indicators: ['Soft, supple graft', 'Minimal contracture', 'Acceptable colour match'],
      },
    ],
    functionalRecovery: 'Depends on location and size. Most patients regain good function with proper physiotherapy.',
    cosmeticOutcome: 'Grafts never look exactly like normal skin. Colour and texture differences are permanent but improve over 1-2 years.',
    successRate: 'Graft take rates of 85-95% expected with proper care.',
  },
  
  followUpCare: {
    schedule: [
      {
        timing: 'Day 5-7',
        purpose: 'First graft inspection',
      },
      {
        timing: '2 weeks',
        purpose: 'Assess healing, start mobilization',
      },
      {
        timing: '1 month',
        purpose: 'Start scar management',
      },
      {
        timing: '3 months',
        purpose: 'Evaluate outcome, physiotherapy progress',
      },
      {
        timing: '6-12 months',
        purpose: 'Long-term assessment, plan revisions if needed',
      },
    ],
    rehabilitationNeeds: [
      'Physiotherapy for range of motion',
      'Pressure garment therapy',
      'Silicone scar therapy',
    ],
    lifestyleModifications: [
      'Moisturize grafted skin twice daily',
      'Protect from sun for at least 1 year',
      'Wear pressure garments as prescribed',
      'Continue high-protein diet until fully healed',
      'No smoking',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Absolute immobilization of graft for first week',
      importance: 'critical',
      consequence: 'Graft failure requiring repeat surgery',
      tips: ['Request help for all needs', 'Use bedpan if necessary', 'Keep grafted limb supported'],
    },
    {
      requirement: 'Attend all follow-up appointments',
      importance: 'critical',
      consequence: 'Undetected graft failure, poor outcomes',
    },
  ],
  
  warningSigns: [
    'Graft becoming dark, pale, or blue',
    'Foul smell from under dressings',
    'Fever above 38°C',
    'Graft separating from wound bed',
    'Increasing pain',
    'Purulent discharge',
  ],
  
  emergencySigns: [
    'High fever with chills (sepsis)',
    'Sudden swelling and severe pain in limb',
    'Bleeding that soaks through dressings',
    'Graft completely separating',
  ],
};

export const burnGraftingEducationList: EducationCondition[] = [
  burnGraftingEducation,
];
