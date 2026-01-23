/**
 * Flap Surgery Education (Local, Regional, Free Flaps)
 * Dr Nnadi-Burns Plastic and Reconstructive Surgery Services
 */

import type { EducationCondition } from '../types';

export const flapSurgeryEducation: EducationCondition = {
  id: 'flap-surgery',
  name: 'Flap Surgery - Local, Regional, and Free Flaps',
  description: 'Comprehensive guide for patients undergoing flap reconstruction surgery',
  category: 'Reconstructive Surgery',
  
  overview: {
    definition: 'A flap is a section of tissue (skin, fat, muscle, or bone) that is moved from one part of the body to another while maintaining its own blood supply. Unlike a graft, a flap carries its blood vessels with it or is reconnected to blood vessels at the new site.',
    causes: [
      'Wounds too deep or complex for skin grafts',
      'Exposed bone, tendon, or hardware requiring coverage',
      'Cancer reconstruction after tumour removal',
      'Burn and trauma reconstruction',
      'Chronic wounds with poor blood supply',
      'Breast reconstruction after mastectomy',
    ],
    riskFactors: [
      'Smoking (major risk for flap failure)',
      'Diabetes (impairs healing and blood vessel function)',
      'Peripheral vascular disease',
      'Previous radiation therapy',
      'Obesity',
      'Malnutrition',
      'Blood clotting disorders',
    ],
    symptoms: [],
    complications: [
      'Flap failure (partial or complete)',
      'Wound infection',
      'Haematoma or seroma',
      'Wound dehiscence (separation)',
      'Donor site problems',
      'Contour irregularity',
      'Sensory changes',
    ],
    prognosis: 'Most flap surgeries are successful with proper patient selection and post-operative care. Success rates range from 90-98% for most flaps.',
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Pre-operative Planning',
      duration: '1-4 weeks',
      description: 'Detailed assessment and planning of flap reconstruction.',
      goals: [
        'Select appropriate flap type',
        'Optimize patient health',
        'Plan donor and recipient sites',
        'Ensure patient understanding and consent',
      ],
      interventions: [
        'Doppler or CT angiography to map blood vessels',
        'Wound bed preparation if needed',
        'Smoking cessation (minimum 4 weeks)',
        'Nutritional optimization',
        'Medical optimization of comorbidities',
      ],
      activities: [
        'STOP SMOKING - this is the single most important thing you can do',
        'Eat a high-protein diet',
        'Avoid blood thinners as directed',
        'Attend all pre-operative appointments',
        'Ask questions and understand the surgery',
      ],
    },
    {
      phase: 2,
      name: 'Surgical Procedure',
      duration: '2-12 hours depending on flap type',
      description: 'The flap surgery itself, ranging from local flaps to complex free tissue transfer.',
      goals: [
        'Harvest flap with intact blood supply',
        'Transfer and inset flap at recipient site',
        'Reconnect blood vessels (for free flaps)',
        'Close donor site',
      ],
      interventions: [
        'General anaesthesia for most cases',
        'Flap elevation and transfer',
        'Microsurgical vessel anastomosis (for free flaps)',
        'Flap insetting and wound closure',
        'Drain placement',
      ],
    },
    {
      phase: 3,
      name: 'Critical Monitoring Period',
      duration: 'First 72 hours (especially for free flaps)',
      description: 'Intensive monitoring of flap blood supply to detect and treat any compromise early.',
      goals: [
        'Detect vascular compromise early',
        'Maintain optimal conditions for flap survival',
        'Prevent complications',
        'Manage pain and immobilization',
      ],
      interventions: [
        'Hourly flap checks (colour, warmth, capillary refill, Doppler)',
        'Strict bed rest and positioning',
        'Warm environment',
        'Blood thinners (as prescribed)',
        'Adequate hydration',
      ],
      activities: [
        'DO NOT SMOKE, CHEW TOBACCO, OR USE NICOTINE',
        'Do not drink caffeine (constricts blood vessels)',
        'Stay warm - avoid cold',
        'Do not cross legs or compress the flap',
        'Report any changes in flap appearance immediately',
        'Allow nurses to perform hourly checks',
      ],
      warningSignsThisPhase: [
        'Flap becoming pale or white (arterial problem)',
        'Flap becoming dark purple or blue (venous problem)',
        'Flap becoming cold',
        'Capillary refill too slow or too fast',
        'Increasing pain or swelling',
        'Bleeding',
      ],
    },
    {
      phase: 4,
      name: 'Intermediate Recovery',
      duration: 'Days 3-14',
      description: 'Progressive stabilization of the flap and initial healing.',
      goals: [
        'Confirm flap survival',
        'Manage surgical sites',
        'Begin gentle mobilization',
        'Donor site healing',
      ],
      activities: [
        'Gradually increase activity as directed',
        'Continue strict no smoking',
        'Maintain nutrition',
        'Begin physiotherapy if prescribed',
        'Wound care as instructed',
      ],
    },
    {
      phase: 5,
      name: 'Long-term Recovery',
      duration: 'Weeks to months',
      description: 'Complete healing, contouring, and rehabilitation.',
      goals: [
        'Complete wound healing',
        'Optimize function',
        'Flap contouring if needed',
        'Scar management',
      ],
      interventions: [
        'Secondary procedures if needed (debulking, scar revision)',
        'Physiotherapy',
        'Scar management',
      ],
    },
  ],
  
  preoperativeInstructions: {
    consultations: [
      'Plastic surgeon consultation',
      'Anaesthesia review',
      'Medical clearance if comorbidities',
    ],
    investigations: [
      'Full blood count',
      'Clotting studies',
      'Blood group and crossmatch',
      'Kidney and liver function',
      'ECG',
      'CT angiography or Doppler for vessel mapping',
    ],
    medications: [
      {
        medication: 'Aspirin and blood thinners',
        instruction: 'Stop 7 days before unless otherwise directed',
        reason: 'Reduce operative bleeding',
      },
      {
        medication: 'Nicotine products (all forms)',
        instruction: 'Stop at least 4 weeks before surgery',
        reason: 'Nicotine causes blood vessel spasm and flap failure',
      },
    ],
    dietaryRestrictions: [
      'No caffeine for 48 hours before surgery',
      'Fasting as per anaesthesia guidelines',
    ],
    physicalPreparation: [
      'Shower with antiseptic soap',
      'No shaving of surgical area',
    ],
    dayBeforeSurgery: [
      'Rest and stay warm',
      'Light meal in evening',
      'No alcohol',
    ],
    dayOfSurgery: [
      'Nothing to eat or drink (except approved medications)',
      'Loose comfortable clothing',
      'Leave jewelry and valuables at home',
    ],
    fastingInstructions: 'No food for 6-8 hours, no clear fluids for 2 hours before surgery.',
  },
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Specific positioning to avoid compression of flap blood supply - follow instructions precisely',
      painManagement: 'Pain will be controlled with medications - avoid NSAIDs that thin blood initially',
      activityLevel: 'Strict bed rest for 3-5 days for free flaps',
      monitoring: [
        'Flap checked every 1-2 hours initially',
        'Colour: should be pink (not pale or purple)',
        'Temperature: should be warm',
        'Capillary refill: should be 1-3 seconds',
        'Doppler signal if implantable monitor placed',
      ],
      expectedSymptoms: [
        'Swelling of the flap',
        'Bruising',
        'Pain (controlled with medications)',
        'Mild fever in first 24-48 hours',
        'Numbness in flap (sensation may return over months)',
      ],
    },
    woundCare: [
      {
        day: 'Days 1-5',
        instruction: 'Dressings checked but not changed unless soiled. Flap monitored regularly.',
      },
      {
        day: 'Days 5-10',
        instruction: 'Drain removal when output decreases. Dressing changes begin.',
      },
      {
        day: 'Days 10-14',
        instruction: 'Suture removal. Gentle wound care.',
      },
    ],
    painManagement: {
      expectedPainLevel: 'Moderate pain at both donor and recipient sites. Usually well controlled with medication.',
      medications: [
        'Paracetamol',
        'Tramadol or other opioids as needed',
        'Avoid aspirin and NSAIDs initially unless prescribed for blood thinning',
      ],
      nonPharmacological: [
        'Positioning for comfort',
        'Gentle distraction',
      ],
    },
    activityRestrictions: [
      {
        activity: 'Any pressure on flap',
        restriction: 'Absolute avoidance',
        duration: '2-4 weeks minimum',
        reason: 'Compression can cut off blood supply',
      },
      {
        activity: 'Smoking/nicotine',
        restriction: 'ABSOLUTE prohibition',
        duration: 'Ideally permanent, minimum 6 weeks',
        reason: 'Causes blood vessel spasm and flap failure',
      },
      {
        activity: 'Caffeine',
        restriction: 'No coffee, tea, cola',
        duration: '2 weeks',
        reason: 'Caffeine causes blood vessel constriction',
      },
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid >5kg',
        duration: '6 weeks',
        reason: 'Prevents strain on surgical sites',
      },
    ],
    dietaryGuidelines: [
      'High-protein diet for healing',
      'No caffeine for 2 weeks',
      'Adequate fluids for good blood flow',
      'No alcohol for 2 weeks',
    ],
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '72 hours',
        expectation: 'Flap surviving, blood supply established',
        indicators: ['Pink colour', 'Warm temperature', 'Normal capillary refill'],
      },
      {
        timeframe: '2-4 weeks',
        expectation: 'Wounds healing, flap integrating',
        indicators: ['Sutures removed', 'No infection', 'Swelling decreasing'],
      },
    ],
    longTerm: [
      {
        timeframe: '3-6 months',
        expectation: 'Flap settled, function improving',
        indicators: ['Contour acceptable', 'Sensation returning in some cases'],
      },
      {
        timeframe: '1 year',
        expectation: 'Final result, secondary procedures if needed',
        indicators: ['Stable soft tissue', 'Function optimized'],
      },
    ],
    functionalRecovery: 'Depends on what was reconstructed. Most patients achieve significant functional improvement.',
    cosmeticOutcome: 'Flaps often bulky initially. Debulking surgery may be offered after 6-12 months.',
    successRate: '90-98% flap survival rates with experienced surgeons and proper post-operative care.',
  },
  
  followUpCare: {
    schedule: [
      {
        timing: '1 week',
        purpose: 'Suture removal, wound check, drain removal',
      },
      {
        timing: '2-4 weeks',
        purpose: 'Assess healing, start physiotherapy',
      },
      {
        timing: '3 months',
        purpose: 'Evaluate outcome, plan any revisions',
      },
      {
        timing: '6-12 months',
        purpose: 'Consider debulking or revision if needed',
      },
    ],
    lifestyleModifications: [
      'Never smoke again - one cigarette can damage the flap permanently',
      'Protect flap from trauma',
      'Maintain healthy weight',
      'Control diabetes carefully',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Absolute smoking cessation',
      importance: 'critical',
      consequence: 'Smoking causes flap failure - one cigarette can kill the flap',
      tips: ['Remove all cigarettes from home', 'Avoid smokers', 'Use nicotine-free cessation aids'],
    },
    {
      requirement: 'Avoid caffeine',
      importance: 'critical',
      consequence: 'Caffeine constricts blood vessels and threatens flap survival',
      tips: ['Avoid coffee, tea, energy drinks, chocolate', 'Check medication ingredients'],
    },
    {
      requirement: 'Maintain warmth',
      importance: 'important',
      consequence: 'Cold causes blood vessel spasm',
      tips: ['Dress warmly', 'Keep flap covered', 'Avoid air conditioning blowing on flap'],
    },
    {
      requirement: 'Report changes immediately',
      importance: 'critical',
      consequence: 'Delays in treating vascular problems cause flap loss',
      tips: ['Know the warning signs', 'Have contact numbers available', 'Do not wait and see'],
    },
  ],
  
  warningSigns: [
    'Flap changing colour (pale, dusky, purple, blue)',
    'Flap becoming cold',
    'Rapid swelling of flap',
    'Bleeding',
    'Increasing pain',
    'Fever',
    'Wound opening',
  ],
  
  emergencySigns: [
    'Flap turning white or blue (return to hospital IMMEDIATELY)',
    'Complete loss of Doppler signal',
    'Uncontrolled bleeding',
    'High fever with confusion',
  ],
};

export const flapSurgeryEducationList: EducationCondition[] = [
  flapSurgeryEducation,
];
