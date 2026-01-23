/**
 * Contracture Release and Reconstructive Excisions Education
 * Dr Nnadi-Burns Plastic and Reconstructive Surgery Services
 */

import type { EducationCondition } from '../types';

export const contractureReleaseEducation: EducationCondition = {
  id: 'contracture-release',
  name: 'Contracture Release and Reconstructive Excisions',
  description: 'Guide for patients undergoing surgery to release scar contractures and restore function',
  category: 'Reconstructive Surgery',
  
  overview: {
    definition: 'Scar contracture release is surgery to release tight scar tissue that restricts movement of joints, causes deformity, or impairs function. Reconstructive excisions involve removing abnormal tissue and repairing the defect.',
    causes: [
      'Burns (most common cause of contractures)',
      'Trauma and injuries',
      'Previous surgery',
      'Infections',
      'Chronic wounds that healed poorly',
    ],
    riskFactors: [
      'Large or deep burns',
      'Burns across joints',
      'Delayed treatment of initial injury',
      'Poor compliance with physiotherapy',
      'Not wearing splints or pressure garments',
      'Genetic tendency to scarring',
      'Darker skin types',
    ],
    symptoms: [
      'Limited range of motion at a joint',
      'Tight, thick scar tissue',
      'Pain with movement',
      'Abnormal posture or limb position',
      'Difficulty with daily activities',
      'Skin breakdown at tension points',
    ],
    complications: [
      'Recurrence of contracture',
      'Graft or flap failure',
      'Wound infection',
      'Nerve or blood vessel injury',
      'Need for further surgery',
    ],
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Pre-operative Assessment',
      duration: '1-4 weeks',
      description: 'Comprehensive evaluation and planning for contracture release.',
      goals: [
        'Assess extent of contracture',
        'Plan surgical approach',
        'Optimize patient for surgery',
        'Arrange post-operative rehabilitation',
      ],
      interventions: [
        'Clinical examination of range of motion',
        'Photographs for documentation',
        'Nutritional assessment',
        'Physiotherapy baseline evaluation',
        'Occupational therapy assessment if hand/upper limb',
      ],
      activities: [
        'Stop smoking for at least 4 weeks before surgery',
        'Eat a nutritious diet',
        'Practice prescribed pre-operative exercises',
        'Understand the importance of post-operative physiotherapy',
      ],
    },
    {
      phase: 2,
      name: 'Surgical Release',
      duration: '1-4 hours',
      description: 'Surgical release of the contracture and wound coverage.',
      goals: [
        'Complete release of contracture',
        'Achieve maximum range of motion',
        'Provide durable wound coverage',
        'Minimize recurrence risk',
      ],
      interventions: [
        'Z-plasty or multiple Z-plasties for linear contractures',
        'Full-thickness skin graft for surface replacement',
        'Flap coverage for complex contractures',
        'Splinting in position of maximum stretch',
      ],
    },
    {
      phase: 3,
      name: 'Immobilization Phase',
      duration: 'Days 1-14',
      description: 'Maintaining the released position while grafts or flaps heal.',
      goals: [
        'Graft or flap survival',
        'Maintain achieved range of motion',
        'Prevent early recurrence',
        'Wound healing',
      ],
      interventions: [
        'Splinting in position of maximum stretch',
        'Wound care',
        'Pain management',
        'Elevation to reduce swelling',
      ],
      activities: [
        'Keep splint on at all times unless instructed otherwise',
        'Do not remove splint yourself',
        'Report any problems immediately',
        'Perform only prescribed movements',
      ],
    },
    {
      phase: 4,
      name: 'Active Rehabilitation',
      duration: 'Weeks 2-12',
      description: 'Intensive physiotherapy to maintain and improve range of motion.',
      goals: [
        'Maximize range of motion',
        'Strengthen muscles',
        'Prevent recurrence',
        'Return to function',
      ],
      interventions: [
        'Daily physiotherapy',
        'Active and passive range of motion exercises',
        'Night splinting',
        'Scar massage and management',
        'Pressure garments',
      ],
      activities: [
        'Perform exercises multiple times daily',
        'Wear splints at night and during rest',
        'Wear pressure garments as prescribed',
        'Apply silicone products to scars',
        'Massage scars gently',
      ],
    },
    {
      phase: 5,
      name: 'Long-term Maintenance',
      duration: 'Months to years',
      description: 'Ongoing scar management and function preservation.',
      goals: [
        'Prevent recurrence',
        'Optimize scar maturation',
        'Maintain function',
        'Plan any additional procedures',
      ],
      activities: [
        'Continue exercises independently',
        'Wear pressure garments until scars mature',
        'Attend all follow-up appointments',
        'Report any tightening immediately',
      ],
    },
  ],
  
  preoperativeInstructions: {
    consultations: [
      'Plastic surgeon',
      'Anaesthetist',
      'Physiotherapist',
      'Occupational therapist (for hand contractures)',
    ],
    investigations: [
      'Full blood count',
      'Blood group and crossmatch if major surgery',
      'Photographs',
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'Stop 5-7 days before surgery',
        reason: 'Reduce bleeding',
      },
    ],
    physicalPreparation: [
      'Skin care and wound preparation',
      'Range of motion measurements',
    ],
    dayBeforeSurgery: [
      'Shower thoroughly',
      'Prepare post-operative supplies',
      'Ensure splints are ready if custom-made',
    ],
    dayOfSurgery: [
      'Fasting as instructed',
      'Wear loose clothing',
    ],
    fastingInstructions: 'No food for 6 hours, no fluids for 2 hours before surgery.',
  },
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Limb positioned in maximum stretch and splinted',
      painManagement: 'Regular pain medication - stretching is uncomfortable',
      activityLevel: 'Rest initially, then gradual mobilization as directed',
      expectedSymptoms: [
        'Significant discomfort from stretched position',
        'Swelling',
        'Bruising',
        'Tight sensation',
      ],
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Keep dressing and splint intact. Elevate limb.',
      },
      {
        day: 'Days 7-14',
        instruction: 'First dressing change, wound check, splint adjustment.',
      },
      {
        day: 'Weeks 2-4',
        instruction: 'Regular wound care, begin active exercises out of splint.',
      },
    ],
    painManagement: {
      expectedPainLevel: 'Moderate pain, especially during exercises and stretching.',
      medications: [
        'Paracetamol regularly',
        'NSAIDs with food',
        'Stronger pain relief for physiotherapy sessions if needed',
      ],
      nonPharmacological: [
        'Elevation',
        'Ice packs (when cleared)',
        'Take pain medication before physiotherapy',
      ],
    },
    activityRestrictions: [
      {
        activity: 'Removing splint',
        restriction: 'Only for exercises and wound care as instructed',
        duration: 'Until cleared by surgeon',
        reason: 'Prevents recurrence',
      },
    ],
    dietaryGuidelines: [
      'High-protein diet for healing',
      'Vitamin C and Zinc for wound repair',
      'Adequate hydration',
    ],
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '2 weeks',
        expectation: 'Wound healing, maintaining surgical gain',
        indicators: ['Wound closed', 'Range of motion preserved'],
      },
    ],
    longTerm: [
      {
        timeframe: '3-6 months',
        expectation: 'Maximum function achieved with physiotherapy',
        indicators: ['Functional range of motion', 'Able to perform daily activities'],
      },
      {
        timeframe: '1-2 years',
        expectation: 'Scar maturation, stable outcome',
        indicators: ['Soft scars', 'Maintained function'],
      },
    ],
    functionalRecovery: 'Depends on severity of original contracture and compliance with rehabilitation. Most patients achieve significant improvement.',
    possibleComplications: [
      'Recurrence of contracture (most common if physiotherapy not followed)',
      'Need for further surgery',
      'Persistent stiffness',
    ],
  },
  
  followUpCare: {
    schedule: [
      {
        timing: '1 week',
        purpose: 'Wound check, adjust splint',
      },
      {
        timing: '2 weeks',
        purpose: 'Suture removal, start active physiotherapy',
      },
      {
        timing: '4-6 weeks',
        purpose: 'Assess range of motion, scar management',
      },
      {
        timing: '3 months',
        purpose: 'Evaluate outcome',
      },
      {
        timing: '6-12 months',
        purpose: 'Long-term assessment, plan any revisions',
      },
    ],
    rehabilitationNeeds: [
      'Daily physiotherapy exercises',
      'Night splinting for 6-12 months',
      'Pressure garment therapy',
      'Scar massage and silicone therapy',
    ],
    lifestyleModifications: [
      'Make exercise a daily habit',
      'Wear splints as prescribed',
      'Report any tightening early',
      'Maintain skin care and moisturizing',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Daily physiotherapy exercises',
      importance: 'critical',
      consequence: 'Contracture will recur without regular stretching',
      tips: ['Set specific times for exercises', 'Do exercises in front of a mirror'],
    },
    {
      requirement: 'Night splinting',
      importance: 'critical',
      consequence: 'Scar tightens at night without splinting',
      tips: ['Make splint wear a bedtime routine', 'Ensure splint is comfortable'],
    },
    {
      requirement: 'Pressure garment wear',
      importance: 'important',
      consequence: 'Hypertrophic scarring and recurrence',
      tips: ['Wear 23 hours per day', 'Have two garments to rotate'],
    },
  ],
  
  warningSigns: [
    'Wound infection signs (redness, pus, fever)',
    'Graft or flap problems (colour change, pain)',
    'Feeling of increasing tightness',
    'Loss of range of motion',
    'Splint causing pain or skin breakdown',
  ],
  
  emergencySigns: [
    'Signs of severe infection',
    'Flap or graft failure',
    'Severe uncontrolled pain',
  ],
};

export const contractureReleaseEducationList: EducationCondition[] = [
  contractureReleaseEducation,
];
