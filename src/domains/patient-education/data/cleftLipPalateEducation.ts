/**
 * Cleft Lip and Palate Repair Education (Paediatric)
 * Dr Nnadi-Burns Plastic and Reconstructive Surgery Services
 */

import type { EducationCondition } from '../types';

export const cleftLipPalateEducation: EducationCondition = {
  id: 'cleft-lip-palate',
  name: 'Cleft Lip and Palate Repair (Paediatric)',
  description: 'Comprehensive guide for parents of children undergoing cleft lip and palate surgery',
  category: 'Pediatric Surgery',
  
  overview: {
    definition: 'Cleft lip and palate are birth defects occurring when the tissues of the lip and/or roof of the mouth (palate) do not join properly during pregnancy. They can occur separately or together. Surgery repairs these gaps to improve feeding, speech, hearing, and appearance.',
    causes: [
      'Multifactorial - combination of genetic and environmental factors',
      'Family history of cleft',
      'Maternal smoking during pregnancy',
      'Maternal diabetes',
      'Certain medications during pregnancy',
      'Folic acid deficiency',
    ],
    riskFactors: [
      'Family history of cleft lip or palate',
      'Maternal smoking or alcohol use',
      'Maternal diabetes',
      'Obesity',
      'Certain medications (anti-seizure drugs)',
    ],
    symptoms: [
      'Visible gap in lip (cleft lip)',
      'Gap in roof of mouth (cleft palate)',
      'Difficulty breastfeeding or bottle feeding',
      'Milk coming through nose during feeding',
      'Slow weight gain',
      'Recurrent ear infections',
      'Speech problems (develops later)',
    ],
    complications: [
      'Feeding difficulties and malnutrition',
      'Speech and language delays',
      'Hearing problems and ear infections',
      'Dental problems',
      'Psychosocial challenges',
    ],
    prognosis: 'With proper treatment, children with cleft lip and palate can lead normal, healthy lives. Most achieve excellent cosmetic and functional outcomes.',
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Initial Assessment and Feeding Support',
      duration: 'Birth to surgery',
      description: 'Establishing feeding, weight gain, and planning for surgery.',
      goals: [
        'Establish effective feeding',
        'Achieve adequate weight gain (Rule of 10s criteria)',
        'Complete pre-operative workup',
        'Family education and support',
      ],
      interventions: [
        'Specialized feeding assessment',
        'Bottle adaptation for cleft feeding',
        'Weight monitoring',
        'Pre-surgical orthopedics (NAM) if indicated',
        'Hearing assessment',
        'Cleft team evaluation',
      ],
      activities: [
        'Learn proper positioning for feeding (upright position)',
        'Use specialized cleft feeding bottles as taught',
        'Burp baby frequently during feeds',
        'Monitor weight gain - report poor feeding',
        'Attend all cleft clinic appointments',
        'Connect with support groups for families',
      ],
    },
    {
      phase: 2,
      name: 'Cleft Lip Repair',
      duration: 'Usually at 3-6 months of age',
      description: 'Surgical repair of the cleft lip to restore appearance and function.',
      goals: [
        'Close the lip gap',
        'Create symmetrical appearance',
        'Reconstruct the muscle and cupid\'s bow',
        'Prepare for palate repair',
      ],
      interventions: [
        'General anaesthesia',
        'Lip repair surgery (various techniques)',
        'Nose correction if needed (primary rhinoplasty)',
        'Arm restraints to protect repair',
      ],
    },
    {
      phase: 3,
      name: 'Cleft Palate Repair',
      duration: 'Usually at 9-18 months of age',
      description: 'Surgical closure of the palate to allow normal speech development.',
      goals: [
        'Close the palatal gap',
        'Create functional soft palate for speech',
        'Separate oral and nasal cavities',
        'Enable normal speech development',
      ],
      interventions: [
        'General anaesthesia',
        'Palate repair surgery',
        'Post-operative monitoring for breathing',
        'Arm restraints to protect repair',
      ],
    },
    {
      phase: 4,
      name: 'Post-operative Care',
      duration: '2-6 weeks after each surgery',
      description: 'Healing and recovery after surgical repair.',
      goals: [
        'Wound healing',
        'Return to feeding',
        'Pain control',
        'Prevent complications',
      ],
      activities: [
        'Keep child calm and comfortable',
        'Administer pain medications as prescribed',
        'Feed with cup or syringe (no bottles or breast initially)',
        'Keep arms restrained as directed',
        'Avoid hard or crunchy foods',
        'Clean wound gently as instructed',
        'Attend follow-up appointments',
      ],
      warningSignsThisPhase: [
        'Difficulty breathing',
        'Bleeding from the repair',
        'Fever above 38°C',
        'Wound opening or separation',
        'Refusing to drink',
        'Decreased wet nappies (dehydration)',
      ],
    },
    {
      phase: 5,
      name: 'Long-term Multidisciplinary Care',
      duration: 'Throughout childhood',
      description: 'Ongoing monitoring and treatment from the cleft team.',
      goals: [
        'Monitor speech development',
        'Manage dental and orthodontic needs',
        'Address hearing issues',
        'Provide psychological support',
        'Plan any additional surgeries',
      ],
      interventions: [
        'Speech and language therapy',
        'Hearing assessments and ENT care',
        'Dental monitoring and orthodontics',
        'Bone grafting to the jaw (usually age 8-11)',
        'Secondary surgeries as needed',
        'Psychological support',
      ],
    },
  ],
  
  preoperativeInstructions: {
    consultations: [
      'Plastic surgeon (cleft team)',
      'Paediatric anaesthetist',
      'Feeding specialist',
      'Audiologist',
    ],
    investigations: [
      'Full blood count',
      'Blood group',
      'Weight and general health assessment',
    ],
    medications: [],
    dietaryRestrictions: [
      'Clear fluids up to 2 hours before surgery',
      'Breast milk up to 4 hours before',
      'Formula up to 6 hours before',
    ],
    physicalPreparation: [
      'Baby should be healthy - no active cold or infection',
      'Baby should weigh at least 4.5-5kg (Rule of 10s)',
      'Haemoglobin at least 10 g/dL',
    ],
    dayBeforeSurgery: [
      'Keep baby healthy and away from sick contacts',
      'Follow feeding instructions carefully',
      'Pack hospital bag with comfort items',
    ],
    dayOfSurgery: [
      'Follow fasting instructions precisely',
      'Bring favourite comfort items',
      'Arrive at scheduled time',
      'Stay calm - babies sense parental anxiety',
    ],
    fastingInstructions: 'Breast milk: 4 hours before. Formula/food: 6 hours before. Clear fluids: 2 hours before.',
  },
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Baby may be held after recovery. Avoid pressure on lip/palate.',
      painManagement: 'Regular paracetamol and ibuprofen. Babies may be fussy.',
      activityLevel: 'Keep baby calm and comfortable. Avoid crying if possible.',
      expectedSymptoms: [
        'Swelling of lip and face',
        'Bruising',
        'Blood-tinged saliva',
        'Fussiness and difficulty sleeping',
        'Temporary changes in feeding pattern',
      ],
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Clean lip wound gently with cotton bud and cooled boiled water. Apply prescribed ointment.',
        frequency: 'After each feed',
      },
      {
        day: 'Days 7-14',
        instruction: 'Continue gentle cleaning. Sutures may dissolve or be removed.',
        frequency: 'After feeds',
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Massage scar gently once healed (usually after 3 weeks). Protect from sun.',
        frequency: 'Multiple times daily',
      },
    ],
    painManagement: {
      expectedPainLevel: 'Moderate discomfort for a few days, improving quickly.',
      medications: [
        'Paracetamol syrup - regular doses as prescribed',
        'Ibuprofen syrup - as prescribed',
      ],
      nonPharmacological: [
        'Comfort and holding',
        'Distraction with toys and singing',
        'Keeping baby occupied',
      ],
    },
    activityRestrictions: [
      {
        activity: 'Bottles and pacifiers (after lip repair)',
        restriction: 'Avoid - use cup, spoon, or syringe',
        duration: '2-3 weeks',
        reason: 'Sucking motion can stress the repair',
      },
      {
        activity: 'Hard or crunchy foods (after palate repair)',
        restriction: 'Soft diet only',
        duration: '4-6 weeks',
        reason: 'Protect the palate repair',
      },
      {
        activity: 'Putting objects in mouth',
        restriction: 'Avoid - use arm restraints',
        duration: '2-3 weeks',
        reason: 'Prevent damage to repair',
      },
    ],
    dietaryGuidelines: [
      'After lip repair: Cup or syringe feeding initially, then return to bottle/breast as directed',
      'After palate repair: Soft, smooth foods only (pureed foods, yogurt, mashed potato)',
      'Avoid hot foods - test temperature',
      'Rinse mouth with water after feeds',
      'No straws for 3 weeks after palate repair',
    ],
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '2-4 weeks',
        expectation: 'Initial healing complete, swelling resolved',
        indicators: ['Wound healed', 'Feeding improved', 'Baby comfortable'],
      },
    ],
    longTerm: [
      {
        timeframe: '6-12 months',
        expectation: 'Scar maturing, function improving',
        indicators: ['Fading scar', 'Good feeding', 'Starting speech sounds'],
      },
      {
        timeframe: '2-5 years',
        expectation: 'Speech developing, ongoing monitoring',
        indicators: ['Understandable speech', 'Normal hearing', 'Good growth'],
      },
    ],
    functionalRecovery: 'Most children achieve normal or near-normal speech with appropriate treatment. Some may need speech therapy or additional surgery.',
    cosmeticOutcome: 'Modern surgical techniques produce excellent results. Scars fade over time. Secondary procedures may be offered in teenage years if desired.',
    successRate: 'Primary repairs are successful in over 95% of cases. Some children need additional procedures for optimal results.',
  },
  
  followUpCare: {
    schedule: [
      {
        timing: '1-2 weeks',
        purpose: 'Wound check, suture removal if needed',
      },
      {
        timing: '6 weeks',
        purpose: 'Assess healing, feeding review',
      },
      {
        timing: '3-6 months',
        purpose: 'Scar assessment, plan next surgery if applicable',
      },
      {
        timing: 'Annually',
        purpose: 'Cleft team review - speech, hearing, dental, psychological',
      },
    ],
    rehabilitationNeeds: [
      'Speech and language therapy (starts around 18 months)',
      'Hearing monitoring and treatment',
      'Dental and orthodontic care',
      'Psychological support for child and family',
    ],
    supportServices: [
      'Cleft lip and palate support groups',
      'Family counselling',
      'Educational support if needed',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Attend all cleft team appointments',
      importance: 'critical',
      consequence: 'Missed issues with speech, hearing, or development',
      tips: ['Put dates in calendar', 'Transport planning'],
    },
    {
      requirement: 'Follow feeding instructions after surgery',
      importance: 'critical',
      consequence: 'Wound breakdown if improper feeding',
      tips: ['Practice cup feeding before surgery', 'Be patient with new feeding method'],
    },
    {
      requirement: 'Keep arm restraints on as directed',
      importance: 'critical',
      consequence: 'Baby can damage repair with hands',
      tips: ['Distract baby during awake times', 'Remove only for supervised cleaning'],
    },
    {
      requirement: 'Complete speech therapy program',
      importance: 'important',
      consequence: 'Persistent speech difficulties',
      tips: ['Practice exercises at home', 'Make it fun and consistent'],
    },
  ],
  
  warningSigns: [
    'Fever above 38°C',
    'Wound appearing red, swollen, or oozing pus',
    'Wound opening or sutures coming undone',
    'Baby refusing to drink for more than a few hours',
    'Fewer wet nappies than normal (dehydration)',
    'Persistent bleeding',
    'Breathing difficulties',
  ],
  
  emergencySigns: [
    'Difficulty breathing or noisy breathing',
    'Blue colour around lips',
    'Severe bleeding that won\'t stop',
    'High fever with lethargy',
    'Complete refusal to drink',
    'Baby very drowsy or difficult to wake',
  ],
};

export const cleftLipPalateEducationList: EducationCondition[] = [
  cleftLipPalateEducation,
];
