/**
 * Additional Specialized Patient Education Content
 * Dr Nnadi-Burns Plastic and Reconstructive Surgery Services
 * 
 * Contains: Breast Reconstruction, Cosmetic Procedures, Keloid Management,
 * Infected Wounds/Necrotizing Infections, Hand Surgery, Pressure Sores,
 * Prosthetics/Amputation, Minor Procedures
 */

import type { EducationCondition } from '../types';

export const breastReconstructionEducation: EducationCondition = {
  id: 'breast-reconstruction',
  name: 'Breast Reconstruction and Post-Mastectomy Care',
  description: 'Guide for patients undergoing breast reconstruction after mastectomy',
  category: 'Breast Surgery',
  
  overview: {
    definition: 'Breast reconstruction is surgery to recreate the breast after mastectomy (breast removal) for cancer or other conditions. Options include implant-based reconstruction or using your own tissue (autologous reconstruction).',
    causes: [
      'Breast cancer requiring mastectomy',
      'Prophylactic mastectomy for high cancer risk',
      'Breast tissue disease',
    ],
    riskFactors: [
      'Smoking (significantly increases complications)',
      'Obesity',
      'Diabetes',
      'Previous radiation therapy',
      'Ongoing chemotherapy',
    ],
    symptoms: [],
    complications: [
      'Implant complications (capsular contracture, rupture)',
      'Flap failure (autologous reconstruction)',
      'Infection',
      'Wound healing problems',
      'Asymmetry',
      'Fat necrosis',
    ],
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Planning and Decision Making',
      duration: 'Weeks to months',
      description: 'Understanding options and choosing the best reconstruction approach.',
      goals: [
        'Understand reconstruction options',
        'Make informed decision',
        'Optimize health for surgery',
      ],
      interventions: [
        'Consultation with plastic surgeon',
        'Discussion of implant vs autologous options',
        'Timing discussion (immediate vs delayed)',
        'Pre-operative optimization',
      ],
    },
    {
      phase: 2,
      name: 'Surgical Reconstruction',
      duration: '2-8 hours depending on technique',
      description: 'The reconstruction surgery itself.',
      goals: [
        'Create new breast mound',
        'Achieve symmetry',
        'Minimize complications',
      ],
    },
    {
      phase: 3,
      name: 'Recovery',
      duration: '4-8 weeks',
      description: 'Healing after reconstruction surgery.',
      goals: [
        'Wound healing',
        'Drain management',
        'Pain control',
        'Gradual return to activities',
      ],
      activities: [
        'Rest with arms supported',
        'Empty and record drain output',
        'Wear surgical bra as directed',
        'Avoid lifting more than 2kg',
        'Gradual arm exercises as directed',
      ],
    },
  ],
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Semi-reclined with arms supported',
      painManagement: 'Regular pain medication, muscle relaxants if tissue expander',
      activityLevel: 'Limited arm movement initially',
      expectedSymptoms: [
        'Swelling and bruising',
        'Tightness across chest',
        'Numbness of breast skin',
        'Drain tubes in place',
      ],
    },
    woundCare: [
      {
        day: 'Days 1-14',
        instruction: 'Keep wounds dry. Empty drains 2-3 times daily, record output.',
        frequency: 'Daily wound check',
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Drains removed when output low. Gentle wound care.',
      },
    ],
    painManagement: {
      expectedPainLevel: 'Moderate pain and tightness, especially with expanders.',
      medications: [
        'Paracetamol regularly',
        'Muscle relaxants if prescribed',
        'Opioids for severe pain',
      ],
      nonPharmacological: [
        'Heat packs for muscle spasm',
        'Gentle movement',
        'Supportive bra',
      ],
    },
    activityRestrictions: [
      {
        activity: 'Arm lifting above shoulder',
        restriction: 'Avoid',
        duration: '4-6 weeks',
        reason: 'Protect muscle repair and implant position',
      },
      {
        activity: 'Driving',
        restriction: 'Not until pain controlled and off opioids',
        duration: '2-4 weeks',
        reason: 'Safety',
      },
    ],
    dietaryGuidelines: [
      'High-protein diet for healing',
      'Adequate fluids',
      'Fibre to prevent constipation from pain medications',
    ],
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '6 weeks',
        expectation: 'Initial healing, drains removed',
        indicators: ['Wounds healed', 'Swelling decreasing'],
      },
    ],
    longTerm: [
      {
        timeframe: '6-12 months',
        expectation: 'Final result after all stages complete',
        indicators: ['Symmetry achieved', 'Natural appearance'],
      },
    ],
    functionalRecovery: 'Most women return to normal activities by 6-8 weeks. Full recovery takes 3-6 months.',
    cosmeticOutcome: 'Reconstructed breasts will not look exactly like natural breasts but excellent results are achievable.',
  },
  
  followUpCare: {
    schedule: [
      { timing: '1 week', purpose: 'Wound check, drain management' },
      { timing: '2 weeks', purpose: 'Drain removal if ready' },
      { timing: '4-6 weeks', purpose: 'Assess healing, plan expansion fills if applicable' },
      { timing: '3-6 months', purpose: 'Plan second stage if needed' },
    ],
    ongoingMonitoring: [
      'Breast surveillance as directed by oncologist',
      'Implant monitoring if applicable',
      'Scar management',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Drain care and recording',
      importance: 'critical',
      consequence: 'Fluid collection and infection',
    },
    {
      requirement: 'Wear surgical bra continuously',
      importance: 'important',
      consequence: 'Implant displacement',
    },
  ],
  
  warningSigns: [
    'Fever',
    'Increasing redness or warmth',
    'Sudden increase in drain output',
    'Wound opening',
    'Signs of implant shifting',
  ],
  
  emergencySigns: [
    'Signs of flap compromise (for autologous reconstruction)',
    'High fever with chills',
    'Severe sudden pain',
  ],
};

export const cosmeticProceduresEducation: EducationCondition = {
  id: 'cosmetic-procedures',
  name: 'Cosmetic Procedures - Abdominoplasty, Liposuction, Breast Aesthetics',
  description: 'Patient education for elective cosmetic surgery procedures',
  category: 'Cosmetic Surgery',
  
  overview: {
    definition: 'Cosmetic surgery includes procedures to improve appearance and body contour. Common procedures include abdominoplasty (tummy tuck), liposuction, breast augmentation, reduction, and lift.',
    causes: ['Patient desire for improved appearance', 'Post-weight loss excess skin', 'Post-pregnancy body changes'],
    riskFactors: [
      'Smoking',
      'Obesity or significant overweight',
      'Unrealistic expectations',
      'Unstable weight',
      'Chronic medical conditions',
    ],
    symptoms: [],
    complications: [
      'Asymmetry',
      'Seroma (fluid collection)',
      'Wound healing problems',
      'Contour irregularities',
      'Scarring',
      'Need for revision surgery',
      'DVT/PE (blood clots)',
    ],
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Consultation and Planning',
      duration: '2-4 weeks',
      description: 'Understanding the procedure, setting realistic expectations, preparing for surgery.',
      goals: [
        'Establish realistic expectations',
        'Psychological assessment',
        'Physical optimization',
        'Informed consent',
      ],
      activities: [
        'Discuss goals and expectations openly',
        'View before and after photos',
        'Understand scars, recovery, and limitations',
        'Achieve stable weight before surgery',
        'Stop smoking 4-6 weeks before surgery',
      ],
    },
    {
      phase: 2,
      name: 'Surgery and Immediate Recovery',
      duration: '1-2 weeks',
      description: 'The surgical procedure and initial healing.',
      goals: [
        'Safe surgical procedure',
        'Pain control',
        'Wound healing',
        'Drain management',
      ],
    },
    {
      phase: 3,
      name: 'Recovery and Garment Wear',
      duration: '4-8 weeks',
      description: 'Continued healing with compression garment use.',
      goals: [
        'Wound healing',
        'Contour shaping',
        'Swelling resolution',
        'Return to activities',
      ],
      activities: [
        'Wear compression garment 24/7 as directed',
        'Gentle walking from day 1',
        'Avoid strenuous activity',
        'Healthy diet for healing',
        'Attend all follow-up appointments',
      ],
    },
  ],
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Depends on procedure - often flexed position for abdominoplasty',
      painManagement: 'Regular pain medications',
      activityLevel: 'Light walking, otherwise rest',
      expectedSymptoms: [
        'Significant swelling',
        'Bruising',
        'Tightness and discomfort',
        'Numbness in treated areas',
        'Drains in place (abdominoplasty)',
      ],
    },
    woundCare: [
      {
        day: 'Days 1-14',
        instruction: 'Keep wounds dry. Drain care if applicable.',
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Sutures removed, begin scar care.',
      },
    ],
    painManagement: {
      expectedPainLevel: 'Moderate to significant for first week, then improving.',
      medications: ['Paracetamol', 'NSAIDs', 'Muscle relaxants', 'Opioids as needed'],
      nonPharmacological: ['Positioning', 'Gentle movement', 'Cold packs'],
    },
    activityRestrictions: [
      {
        activity: 'Exercise and gym',
        restriction: 'No strenuous activity',
        duration: '4-6 weeks',
        reason: 'Allow healing, prevent seroma',
      },
      {
        activity: 'Heavy lifting',
        restriction: 'Nothing over 5kg',
        duration: '4-6 weeks',
        reason: 'Prevent wound stress',
      },
    ],
    dietaryGuidelines: [
      'High-protein diet',
      'Stay hydrated',
      'Avoid excess sodium (increases swelling)',
      'No alcohol for 2 weeks',
    ],
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '6 weeks',
        expectation: 'Significant swelling resolved, return to activities',
        indicators: ['Wounds healed', 'Able to exercise'],
      },
    ],
    longTerm: [
      {
        timeframe: '6-12 months',
        expectation: 'Final result visible, swelling fully resolved',
        indicators: ['Contour stable', 'Scars fading'],
      },
    ],
    functionalRecovery: 'Most patients return to work in 1-3 weeks depending on job type.',
    cosmeticOutcome: 'Results are permanent but affected by weight changes and aging. Scars fade but are permanent.',
  },
  
  followUpCare: {
    schedule: [
      { timing: '1 week', purpose: 'Wound check' },
      { timing: '2-3 weeks', purpose: 'Drain removal, sutures' },
      { timing: '6 weeks', purpose: 'Progress review, clear for exercise' },
      { timing: '3-6 months', purpose: 'Final result assessment' },
    ],
    lifestyleModifications: [
      'Maintain stable weight',
      'Healthy diet and exercise',
      'Protect scars from sun',
      'Wear compression garments as directed',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Wear compression garment continuously',
      importance: 'critical',
      consequence: 'Seroma, poor contour, prolonged swelling',
      tips: ['Have two garments to rotate', 'Remove only for bathing'],
    },
    {
      requirement: 'Avoid strenuous activity',
      importance: 'critical',
      consequence: 'Seroma, wound problems, poor result',
    },
    {
      requirement: 'Maintain stable weight',
      importance: 'important',
      consequence: 'Weight changes alter surgical result',
    },
  ],
  
  warningSigns: [
    'Increasing fluid collection',
    'Wound opening or oozing',
    'Fever',
    'Asymmetry or contour problems',
    'Persistent numbness or pain',
  ],
  
  emergencySigns: [
    'Sudden severe pain, especially in calf (DVT)',
    'Shortness of breath (pulmonary embolism)',
    'High fever with confusion',
    'Severe wound infection',
  ],
};

export const keloidManagementEducation: EducationCondition = {
  id: 'keloid-management',
  name: 'Keloid and Hypertrophic Scar Management',
  description: 'Comprehensive guide to understanding and treating abnormal scarring',
  category: 'Scar Management',
  
  overview: {
    definition: 'Keloids are raised scars that grow beyond the original wound boundaries. Hypertrophic scars are raised but stay within wound margins. Both result from abnormal collagen production during healing.',
    causes: [
      'Any wound, cut, burn, or surgery',
      'Acne and skin conditions',
      'Piercings and tattoos',
      'Vaccination sites',
      'Insect bites',
    ],
    riskFactors: [
      'Darker skin (African, Asian descent - highest risk)',
      'Age 10-30 years',
      'Family history of keloids',
      'Location: earlobes, chest, shoulders, upper back',
      'Wound infection or tension',
    ],
    symptoms: [
      'Raised, firm scar tissue',
      'Extending beyond original wound (keloid)',
      'Itching',
      'Pain or tenderness',
      'Redness or darker pigmentation',
      'Progressive enlargement (keloid)',
    ],
    complications: [
      'Cosmetic disfigurement',
      'Functional impairment',
      'Psychological distress',
      'Recurrence after treatment',
    ],
    epidemiology: 'Keloids are 15-20 times more common in people of African descent. They affect up to 16% of the African population.',
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Assessment and Conservative Treatment',
      duration: 'Weeks to months',
      description: 'Initial non-surgical management for scars.',
      goals: [
        'Flatten and soften scar',
        'Reduce symptoms (itching, pain)',
        'Prevent progression',
      ],
      interventions: [
        'Silicone sheets or gel (12+ hours daily)',
        'Pressure therapy',
        'Steroid injections (triamcinolone)',
        'Massage and moisturizing',
      ],
      activities: [
        'Apply silicone products consistently',
        'Wear pressure garments if prescribed',
        'Protect from sun exposure',
        'Attend regular review appointments',
      ],
    },
    {
      phase: 2,
      name: 'Surgical Excision (if indicated)',
      duration: 'Day surgery',
      description: 'Surgical removal combined with adjuvant therapy to prevent recurrence.',
      goals: [
        'Remove bulk of keloid',
        'Minimize tension on closure',
        'Plan immediate adjuvant therapy',
      ],
      interventions: [
        'Surgical excision with tension-free closure',
        'Immediate post-operative steroid injection',
        'Consider radiotherapy within 24-48 hours',
        'Pressure therapy',
      ],
    },
    {
      phase: 3,
      name: 'Adjuvant Therapy',
      duration: 'Weeks to months',
      description: 'Treatment after excision to prevent recurrence.',
      goals: [
        'Prevent keloid recurrence',
        'Optimize wound healing',
        'Achieve flat, soft scar',
      ],
      interventions: [
        'Steroid injections every 4-6 weeks',
        'Superficial radiotherapy (specialized centres)',
        'Silicone therapy',
        'Pressure garments',
      ],
      activities: [
        'Attend all injection appointments',
        'Apply silicone products daily',
        'Wear pressure earrings or garments',
        'Report any recurrence early',
      ],
    },
  ],
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Keep wound clean and protected',
      painManagement: 'Simple analgesics, steroid injection discomfort is brief',
      activityLevel: 'Normal activities, avoid trauma to area',
      expectedSymptoms: [
        'Swelling immediately after',
        'Temporary skin lightening from steroids',
        'Mild pain at injection sites',
      ],
    },
    woundCare: [
      {
        day: 'Days 1-14 after excision',
        instruction: 'Keep wound clean and dry. Gentle wound care.',
      },
      {
        day: 'After 2 weeks',
        instruction: 'Begin silicone therapy. Start pressure therapy if applicable.',
        frequency: 'Silicone 12+ hours daily, pressure 23 hours daily',
      },
    ],
    painManagement: {
      expectedPainLevel: 'Mild discomfort, steroid injections cause brief pain.',
      medications: ['Paracetamol as needed'],
      nonPharmacological: ['Ice after injections', 'Pressure therapy helps with discomfort'],
    },
    activityRestrictions: [],
    dietaryGuidelines: ['No specific restrictions'],
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '3-6 months',
        expectation: 'Scar flattening and softening',
        indicators: ['Reduced height', 'Softer texture', 'Less symptoms'],
      },
    ],
    longTerm: [
      {
        timeframe: '1-2 years',
        expectation: 'Maximum improvement achieved, monitor for recurrence',
        indicators: ['Flat scar', 'Stable size', 'Minimal symptoms'],
      },
    ],
    functionalRecovery: 'Depends on location. Function usually preserved or improved.',
    cosmeticOutcome: 'Complete resolution is often not possible. Goals are significant improvement and symptom relief.',
    possibleComplications: [
      'Recurrence (30-100% without adjuvant therapy, 10-30% with comprehensive treatment)',
      'Skin atrophy from steroids',
      'Hypopigmentation',
    ],
  },
  
  followUpCare: {
    schedule: [
      { timing: '2 weeks', purpose: 'Wound check after excision' },
      { timing: 'Monthly for 6 months', purpose: 'Steroid injections, monitoring' },
      { timing: 'Every 3 months for 2 years', purpose: 'Monitor for recurrence' },
    ],
    ongoingMonitoring: [
      'Regular self-examination',
      'Early reporting of any regrowth',
      'Long-term follow-up',
    ],
    lifestyleModifications: [
      'Avoid unnecessary surgery or piercings',
      'If surgery needed, inform surgeon of keloid history',
      'Immediate pressure therapy after any wound',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Consistent silicone therapy',
      importance: 'critical',
      consequence: 'Treatment failure and recurrence',
      tips: ['Apply morning and night', 'Keep products accessible'],
    },
    {
      requirement: 'Complete steroid injection course',
      importance: 'critical',
      consequence: 'Inadequate treatment, recurrence',
    },
    {
      requirement: 'Wear pressure garments/earrings',
      importance: 'critical',
      consequence: 'Recurrence without consistent pressure',
    },
    {
      requirement: 'Long-term follow-up',
      importance: 'important',
      consequence: 'Delayed detection of recurrence',
    },
  ],
  
  warningSigns: [
    'Scar enlarging again',
    'Increasing itching or pain',
    'Skin breakdown',
    'Severe skin thinning from steroids',
  ],
  
  emergencySigns: [
    'Signs of infection',
    'Allergic reaction to treatment',
  ],
};

export const infectedWoundsEducation: EducationCondition = {
  id: 'infected-wounds',
  name: 'Management of Infected Wounds, Necrotizing Infections and Debridement',
  description: 'Critical information for patients with serious wound infections',
  category: 'Wound Care',
  
  overview: {
    definition: 'Infected wounds range from simple wound infections to life-threatening necrotizing soft tissue infections (NSTI, including necrotizing fasciitis). These require urgent treatment including antibiotics and often surgical debridement.',
    causes: [
      'Bacteria entering through wounds',
      'Post-surgical infections',
      'Trauma and crush injuries',
      'Skin conditions (boils, cellulitis progressing)',
      'Injection sites',
    ],
    riskFactors: [
      'Diabetes (major risk factor)',
      'Peripheral vascular disease',
      'Immunosuppression',
      'Obesity',
      'Malnutrition',
      'Chronic kidney disease',
      'Intravenous drug use',
    ],
    symptoms: [
      'Pain out of proportion to appearance',
      'Spreading redness',
      'Swelling and warmth',
      'Pus or discharge',
      'Fever and chills',
      'Skin discoloration (grey, purple, black)',
      'Crepitus (crackling under skin)',
      'Blistering',
    ],
    complications: [
      'Sepsis and septic shock',
      'Multi-organ failure',
      'Limb loss',
      'Death',
      'Extensive tissue loss requiring reconstruction',
    ],
    prognosis: 'Early treatment is critical. Mortality from necrotizing fasciitis can be 20-40% but is much lower with early aggressive treatment.',
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Emergency Assessment',
      duration: 'Hours',
      description: 'Urgent evaluation and initiation of treatment.',
      goals: [
        'Recognize severity',
        'Start IV antibiotics immediately',
        'Plan surgical debridement',
        'Resuscitate if septic',
      ],
      interventions: [
        'IV access and blood tests',
        'Broad-spectrum IV antibiotics',
        'Fluid resuscitation',
        'Urgent surgical consultation',
        'ICU admission if septic',
      ],
    },
    {
      phase: 2,
      name: 'Surgical Debridement',
      duration: 'May require multiple procedures',
      description: 'Removal of all dead and infected tissue.',
      goals: [
        'Remove all necrotic tissue',
        'Obtain tissue for culture',
        'Assess extent of infection',
        'Plan for wound management',
      ],
      interventions: [
        'General anaesthesia',
        'Aggressive surgical debridement',
        'Wound washout',
        'Negative pressure wound therapy (VAC)',
        'Return to theatre for re-look and further debridement',
      ],
    },
    {
      phase: 3,
      name: 'Critical Care Phase',
      duration: 'Days to weeks',
      description: 'Intensive supportive care and repeated wound management.',
      goals: [
        'Treat sepsis',
        'Control infection',
        'Optimize nutrition',
        'Prepare wound for closure',
      ],
      interventions: [
        'Targeted IV antibiotics based on cultures',
        'Nutritional support (often via feeding tube)',
        'Diabetes control',
        'Daily wound care',
        'Repeat debridement as needed',
      ],
    },
    {
      phase: 4,
      name: 'Wound Reconstruction',
      duration: 'Weeks to months',
      description: 'Closure of wounds after infection controlled.',
      goals: [
        'Achieve wound coverage',
        'Restore function',
        'Minimize disability',
      ],
      interventions: [
        'Skin grafting',
        'Flap surgery if needed',
        'Rehabilitation',
      ],
    },
  ],
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'As directed based on wound location',
      painManagement: 'IV pain medications, often significant pain',
      activityLevel: 'Initially bed rest, gradual mobilization',
      expectedSymptoms: [
        'Significant wound from debridement',
        'Drains and wound VAC in place',
        'Prolonged hospitalization',
        'Feeling very unwell initially',
      ],
    },
    woundCare: [
      {
        day: 'Daily or every 2 days',
        instruction: 'Wound dressing changes in hospital. VAC changes if applicable.',
      },
    ],
    painManagement: {
      expectedPainLevel: 'Severe initially, gradually improving.',
      medications: ['IV opioids', 'Transition to oral as improving'],
      nonPharmacological: ['Positioning', 'Distraction'],
    },
    activityRestrictions: [
      {
        activity: 'Varies based on wound location',
        restriction: 'As directed by medical team',
        duration: 'Until cleared',
        reason: 'Protect healing',
      },
    ],
    dietaryGuidelines: [
      'High-protein, high-calorie diet essential',
      'May need supplements or tube feeding',
      'Good diabetes control critical',
      'Adequate vitamins and minerals',
    ],
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: 'Days to weeks',
        expectation: 'Infection controlled, wounds clean',
        indicators: ['No fever', 'Wounds healthy', 'Improving clinically'],
      },
    ],
    longTerm: [
      {
        timeframe: 'Months',
        expectation: 'Wounds healed, function optimized',
        indicators: ['Wound closed', 'Rehabilitation complete'],
      },
    ],
    functionalRecovery: 'Depends on extent of tissue loss. May range from full recovery to permanent disability or amputation.',
    possibleComplications: [
      'Prolonged hospitalization',
      'Multiple surgeries',
      'Limb amputation',
      'Death in severe cases',
    ],
  },
  
  followUpCare: {
    schedule: [
      { timing: 'Frequent during hospitalization', purpose: 'Wound management' },
      { timing: 'Weekly after discharge', purpose: 'Wound checks' },
      { timing: 'Long-term', purpose: 'Reconstruction, rehabilitation' },
    ],
    ongoingMonitoring: [
      'Diabetes control',
      'Wound healing',
      'Nutritional status',
      'Signs of recurrence',
    ],
    lifestyleModifications: [
      'Excellent diabetes control',
      'Foot care if diabetic',
      'Nutrition optimization',
      'Report any wound changes early',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Complete full antibiotic course',
      importance: 'critical',
      consequence: 'Recurrence or antibiotic resistance',
    },
    {
      requirement: 'Diabetes control',
      importance: 'critical',
      consequence: 'Poor healing and recurrence',
    },
    {
      requirement: 'Attend all wound care appointments',
      importance: 'critical',
      consequence: 'Wound complications',
    },
  ],
  
  warningSigns: [
    'Fever returning',
    'Increasing pain or redness',
    'New areas of skin discoloration',
    'Foul smell from wound',
    'Feeling unwell',
  ],
  
  emergencySigns: [
    'High fever with chills and confusion',
    'Rapidly spreading redness or discoloration',
    'Pain out of proportion to appearance',
    'Feeling severely unwell',
    'Crepitus (crackling) under skin',
  ],
};

export const handSurgeryEducation: EducationCondition = {
  id: 'hand-surgery',
  name: 'Hand Surgery, Tendon/Nerve Repair and Rehabilitation',
  description: 'Guide for patients undergoing hand surgery and therapy',
  category: 'Hand Surgery',
  
  overview: {
    definition: 'Hand surgery includes repair of tendons (connect muscle to bone), nerves (provide sensation and motor function), and other structures. Success depends heavily on proper post-operative hand therapy.',
    causes: [
      'Lacerations and cuts',
      'Crush injuries',
      'Burns',
      'Degenerative conditions',
      'Congenital problems',
    ],
    riskFactors: [
      'Smoking',
      'Diabetes',
      'Delayed treatment',
      'Poor compliance with therapy',
      'Infection',
    ],
    symptoms: [],
    complications: [
      'Stiffness and adhesions',
      'Re-rupture of tendon',
      'Nerve not recovering',
      'Infection',
      'Need for further surgery',
    ],
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Surgical Repair',
      duration: '1-4 hours',
      description: 'Primary repair of injured structures.',
      goals: [
        'Repair tendons and/or nerves',
        'Achieve stable repair',
        'Protect with splinting',
      ],
    },
    {
      phase: 2,
      name: 'Immobilization and Protection',
      duration: '1-4 weeks depending on repair',
      description: 'Protecting the repair while beginning controlled movement.',
      goals: [
        'Protect repair from rupture',
        'Prevent adhesions',
        'Begin early controlled mobilization (ECM)',
      ],
      interventions: [
        'Custom splint (usually in specific position)',
        'Hand therapy protocol',
        'Passive then active-assisted exercises',
        'Elevation and swelling management',
      ],
      activities: [
        'Keep splint on at all times except during exercises',
        'Attend hand therapy 1-2 times per week',
        'Perform exercises multiple times daily as taught',
        'Keep hand elevated',
        'No gripping, lifting, or resisted movement',
      ],
    },
    {
      phase: 3,
      name: 'Controlled Active Motion',
      duration: 'Weeks 4-8',
      description: 'Gradual increase in active movement.',
      goals: [
        'Increase range of motion',
        'Begin gentle active exercises',
        'Gradually wean from splint',
      ],
      activities: [
        'More active exercises as directed by therapist',
        'Splint wear reduced gradually',
        'Light functional use',
        'Avoid sudden or resisted movements',
      ],
    },
    {
      phase: 4,
      name: 'Strengthening and Function',
      duration: 'Weeks 8-12+',
      description: 'Progressive strengthening and return to function.',
      goals: [
        'Regain strength',
        'Return to normal activities',
        'Maximize function',
      ],
      activities: [
        'Resistance exercises',
        'Grip strengthening',
        'Functional activities',
        'Return to work planning',
      ],
    },
  ],
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Hand elevated above heart level',
      painManagement: 'Regular pain medication, keep moving fingers in splint',
      activityLevel: 'Rest hand, keep splint on',
      expectedSymptoms: [
        'Swelling',
        'Bruising',
        'Numbness (from local anaesthesia)',
        'Pain with movement',
      ],
    },
    woundCare: [
      {
        day: 'Days 1-14',
        instruction: 'Keep wound dry. Do not remove splint yourself.',
      },
      {
        day: 'Day 10-14',
        instruction: 'Sutures removed. Scar massage may begin.',
      },
    ],
    painManagement: {
      expectedPainLevel: 'Moderate initially, improving quickly.',
      medications: ['Paracetamol', 'NSAIDs', 'Opioids short-term if needed'],
      nonPharmacological: ['Elevation', 'Ice (if instructed)', 'Movement within allowed range'],
    },
    activityRestrictions: [
      {
        activity: 'Lifting and gripping',
        restriction: 'Absolutely no resistance to repaired structures',
        duration: '6-12 weeks depending on repair',
        reason: 'Prevent re-rupture',
      },
    ],
    dietaryGuidelines: ['Healthy balanced diet', 'No smoking'],
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '6 weeks',
        expectation: 'Repair healed, good passive motion',
        indicators: ['Wound healed', 'Following protocol'],
      },
    ],
    longTerm: [
      {
        timeframe: '3-6 months',
        expectation: 'Maximum recovery of motion and strength',
        indicators: ['Functional grip', 'Return to activities'],
      },
      {
        timeframe: '6-12 months for nerve repair',
        expectation: 'Nerve recovery (if applicable)',
        indicators: ['Sensation returning', 'Muscle function improving'],
      },
    ],
    functionalRecovery: 'Tendon repairs: Good function expected with compliance. Nerve repairs: Recovery slower, may be incomplete.',
    possibleComplications: [
      'Stiffness (most common)',
      'Tendon rupture',
      'Nerve recovery failure',
    ],
  },
  
  followUpCare: {
    schedule: [
      { timing: '1 week', purpose: 'Wound check, start therapy' },
      { timing: 'Weekly during therapy', purpose: 'Progress assessment' },
      { timing: '6 weeks', purpose: 'Assess healing, advance protocol' },
      { timing: '3 months', purpose: 'Functional assessment' },
    ],
    rehabilitationNeeds: [
      'Hand therapy 1-2 times weekly minimum',
      'Home exercise program multiple times daily',
      'Splint modification as needed',
      'Scar management',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Attend all hand therapy appointments',
      importance: 'critical',
      consequence: 'Stiffness and poor outcome',
    },
    {
      requirement: 'Perform exercises multiple times daily',
      importance: 'critical',
      consequence: 'Adhesions and limited function',
      tips: ['Set alarms for exercise times', 'Do exercises after meals'],
    },
    {
      requirement: 'Follow activity restrictions precisely',
      importance: 'critical',
      consequence: 'Tendon rupture requiring more surgery',
    },
  ],
  
  warningSigns: [
    'Sudden loss of finger movement',
    'Increasing pain or swelling',
    'Wound infection signs',
    'Splint problems',
  ],
  
  emergencySigns: [
    'Sudden inability to move finger (tendon rupture)',
    'Signs of severe infection',
    'Finger colour change (white, blue)',
  ],
};

export const specializedEducationList: EducationCondition[] = [
  breastReconstructionEducation,
  cosmeticProceduresEducation,
  keloidManagementEducation,
  infectedWoundsEducation,
  handSurgeryEducation,
];
