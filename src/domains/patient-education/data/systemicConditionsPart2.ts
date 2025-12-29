/**
 * Patient Education Content - Category L: Systemic and Complicating Conditions
 * Part 2: Anticoagulation Management and Immunosuppression
 * 
 * CareBridge Innovations in Healthcare
 * Content aligned with WHO Guidelines and Perioperative Best Practices
 */

import type { EducationCondition } from '../types';

/**
 * Anticoagulation and Surgery
 */
export const anticoagulationAndSurgery: EducationCondition = {
  id: 'systemic-anticoagulation-surgery',
  name: 'Anticoagulation and Surgery',
  category: 'L',
  icdCode: 'Z79.01',
  description: 'Management of blood-thinning medications in patients undergoing surgery, balancing bleeding and clotting risks.',
  alternateNames: ['Blood Thinner Management', 'Perioperative Anticoagulation', 'Bridging Therapy'],
  
  overview: {
    definition: 'Many surgical patients take blood-thinning medications (anticoagulants or antiplatelet drugs) for conditions like atrial fibrillation, mechanical heart valves, deep vein thrombosis, or after coronary stents. These medications reduce blood clotting, which increases surgical bleeding risk. However, stopping them can cause dangerous clots. Careful management involves assessing both bleeding and clotting risks, deciding whether to stop, continue, or bridge with injectable medications.',
    causes: [
      'Atrial fibrillation',
      'Mechanical heart valves',
      'Deep vein thrombosis/pulmonary embolism',
      'Coronary artery stents',
      'Previous stroke',
      'Peripheral vascular disease',
      'Thrombophilia (clotting disorders)'
    ],
    symptoms: [
      'Patient taking anticoagulant medications',
      'History of blood clots',
      'Artificial heart valve',
      'Recent stent placement',
      'Atrial fibrillation'
    ],
    riskFactors: [
      'High bleeding risk surgery',
      'High thrombotic risk condition',
      'Recent clot event',
      'Multiple anticoagulants/antiplatelets',
      'Kidney dysfunction (affects drug clearance)',
      'Elderly patients',
      'Cancer-associated thrombosis'
    ],
    complications: [
      'Surgical bleeding',
      'Hematoma formation',
      'Need for blood transfusion',
      'Need for return to operating room',
      'Stroke (if anticoagulation stopped)',
      'Heart attack (if antiplatelets stopped post-stent)',
      'Deep vein thrombosis/pulmonary embolism',
      'Valve thrombosis'
    ],
    prevalence: 'Approximately 20-30% of surgical patients take some form of anticoagulant or antiplatelet medication.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Risk Assessment',
      duration: '2-4 weeks before surgery',
      description: 'Assessing both bleeding and clotting risks to guide management.',
      goals: [
        'Identify all blood-thinning medications',
        'Assess thrombotic risk (CHA2DS2-VASc for AF)',
        'Assess bleeding risk of surgery',
        'Determine optimal management plan'
      ],
      activities: [
        'Complete medication history',
        'Indication for anticoagulation',
        'Time since stent placement',
        'Recent clot history',
        'Type of surgery planned',
        'Consult cardiologist if needed'
      ],
      warningSignsThisPhase: [
        'Very recent stent (<3 months for drug-eluting)',
        'Very recent VTE (<3 months)',
        'Mechanical heart valve (never stop anticoagulation)',
        'High-risk surgery on anticoagulation'
      ]
    },
    {
      phase: 2,
      name: 'Preoperative Medication Management',
      duration: 'Days before surgery',
      description: 'Stopping or bridging anticoagulation according to plan.',
      goals: [
        'Clear medications at appropriate time',
        'Bridge with heparin if needed',
        'Maintain protection if high risk',
        'Prepare for surgery'
      ],
      activities: [
        'Stop warfarin 5 days before (check INR)',
        'Stop DOACs 24-72 hours before (depending on drug and kidney function)',
        'Bridge with low-molecular-weight heparin if high risk',
        'Continue or stop aspirin (based on surgery type)',
        'Hold second antiplatelet if possible (with cardiology input)',
        'Check coagulation tests'
      ],
      medications: [
        {
          name: 'Warfarin',
          purpose: 'Stop 5 days before surgery',
          duration: 'Check INR day before; should be <1.5'
        },
        {
          name: 'DOACs (rivaroxaban, apixaban, dabigatran)',
          purpose: 'Stop 24-72 hours before based on bleeding risk and kidney function',
          duration: 'Follow specific guidance for each drug'
        },
        {
          name: 'Aspirin',
          purpose: 'May continue for many surgeries; stop for high bleeding risk',
          duration: 'Stop 7 days before if needed'
        },
        {
          name: 'Clopidogrel',
          purpose: 'Stop if possible; continue if recent stent',
          duration: 'Stop 5-7 days before if safe'
        }
      ],
      warningSignsThisPhase: [
        'INR still high day before surgery (may need vitamin K)',
        'Concerns about stopping medications',
        'New symptoms suggesting clot'
      ]
    },
    {
      phase: 3,
      name: 'Perioperative Period',
      duration: 'Day of surgery',
      description: 'Surgery with careful hemostasis and clot prevention.',
      goals: [
        'Safe surgery without excessive bleeding',
        'Prevent clots during and after surgery',
        'Monitor for complications',
        'Plan resumption of medications'
      ],
      activities: [
        'Confirm last dose of anticoagulant',
        'Careful surgical hemostasis',
        'Mechanical VTE prophylaxis (compression stockings)',
        'Consider pharmacological VTE prophylaxis',
        'Monitor for bleeding'
      ],
      warningSignsThisPhase: [
        'Excessive surgical bleeding',
        'INR still elevated',
        'Signs of clot (less common during surgery)'
      ]
    },
    {
      phase: 4,
      name: 'Post-Operative Management',
      duration: 'Days to weeks',
      description: 'Restarting anticoagulation and monitoring for complications.',
      goals: [
        'Restart anticoagulation safely',
        'Prevent VTE',
        'Balance bleeding risk',
        'Monitor for complications'
      ],
      activities: [
        'Resume anticoagulation when hemostasis secure (24-72 hours)',
        'VTE prophylaxis in interim',
        'Monitor for bleeding',
        'Monitor for signs of clot',
        'Resume full anticoagulation gradually if warfarin'
      ],
      medications: [
        {
          name: 'VTE prophylaxis (enoxaparin)',
          purpose: 'Prevent blood clots while anticoagulation held',
          duration: 'Until mobile or anticoagulation resumed'
        },
        {
          name: 'Anticoagulants',
          purpose: 'Resume when safe',
          duration: 'Lifelong in most cases'
        }
      ],
      warningSignsThisPhase: [
        'Bleeding from wound or drain',
        'Falling hemoglobin',
        'Signs of DVT (leg swelling, pain)',
        'Signs of PE (shortness of breath, chest pain)',
        'Signs of stroke (weakness, speech problems)'
      ]
    },
    {
      phase: 5,
      name: 'Return to Long-Term Anticoagulation',
      duration: 'Weeks',
      description: 'Resumption of usual anticoagulation regimen.',
      goals: [
        'Achieve therapeutic anticoagulation',
        'Prevent long-term complications',
        'Return to normal management'
      ],
      activities: [
        'Achieve target INR if warfarin',
        'Confirm appropriate DOAC dosing',
        'Resume antiplatelet therapy',
        'Ensure ongoing monitoring plan'
      ],
      warningSignsThisPhase: [
        'INR too high or too low',
        'Bleeding episodes',
        'Thromboembolic events',
        'Wound problems'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Surgeon',
      'Cardiologist (if cardiac indication for anticoagulation)',
      'Hematologist (if complex)',
      'Anticoagulation clinic'
    ],
    investigations: [
      'INR (if on warfarin)',
      'Kidney function tests (affects DOAC clearance)',
      'Full blood count',
      'Type and screen (in case blood needed)'
    ],
    medications: [
      {
        medication: 'Warfarin',
        instruction: 'stop',
        reason: 'Stop 5 days before surgery; check INR day before'
      },
      {
        medication: 'Rivaroxaban (Xarelto)',
        instruction: 'stop',
        reason: 'Stop 24-48 hours before (longer if kidney problems)'
      },
      {
        medication: 'Apixaban (Eliquis)',
        instruction: 'stop',
        reason: 'Stop 24-48 hours before (longer if kidney problems)'
      },
      {
        medication: 'Dabigatran (Pradaxa)',
        instruction: 'stop',
        reason: 'Stop 24-72 hours before (longer with kidney problems)'
      },
      {
        medication: 'Aspirin',
        instruction: 'discuss',
        reason: 'May continue or stop 7 days before depending on surgery'
      },
      {
        medication: 'Clopidogrel (Plavix)',
        instruction: 'discuss',
        reason: 'Stop 5-7 days before if safe; if recent stent, consult cardiology'
      }
    ],
    fastingInstructions: 'Standard fasting as directed for surgery.',
    dayBeforeSurgery: [
      'Confirm you have stopped anticoagulant as directed',
      'If on warfarin, have INR checked',
      'If bridging with heparin, follow specific instructions',
      'Report any unusual bleeding or bruising'
    ],
    whatToBring: [
      'List of all medications with doses',
      'Anticoagulation booklet/record if you have one',
      'Contact for anticoagulation clinic'
    ],
    dayOfSurgery: [
      'Confirm last dose taken',
      'No anticoagulant day of surgery (unless specifically instructed)',
      'Inform team of all blood thinners'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Depends on procedure; spinal/epidural may be affected by anticoagulation status',
    procedureDescription: 'During surgery, the team pays careful attention to hemostasis (stopping bleeding). For patients on anticoagulation, extra care is taken. Drain placement may be used. Bleeding tendency is considered in surgical planning.',
    duration: 'Varies by procedure',
    whatToExpect: 'Surgery proceeds with attention to bleeding risk. You may have drains placed. Blood transfusion is available if needed.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'As per surgery type',
      expectedSymptoms: [
        'Normal surgical bleeding should be minimal',
        'May have drains',
        'Will have clot prevention measures (stockings, injections)',
        'Monitoring for bleeding and clots'
      ],
      activityLevel: 'Early mobilization helps prevent blood clots'
    },
    woundCare: [
      {
        day: 'Daily',
        instruction: 'Monitor for excessive bleeding, hematoma, or bruising.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'As per surgery type',
      medications: [
        'May avoid NSAIDs (increase bleeding)',
        'Use paracetamol-based pain relief',
        'Prescribed medications as directed'
      ],
      nonPharmacological: [
        'Ice packs',
        'Elevation',
        'Compression if applicable'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Remain sedentary',
        restriction: 'Avoid prolonged immobility',
        duration: 'Throughout recovery',
        reason: 'Immobility increases clot risk'
      },
      {
        activity: 'Activities risking injury',
        restriction: 'Be cautious',
        duration: 'While on anticoagulation',
        reason: 'Increased bleeding if injured'
      }
    ],
    dietaryGuidelines: [
      'Normal diet',
      'If on warfarin, maintain consistent vitamin K intake',
      'Avoid excessive alcohol (affects INR)',
      'Stay hydrated'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '24-72 hours',
        expectation: 'Resume anticoagulation if no bleeding concerns'
      },
      {
        timeframe: '1-2 weeks',
        expectation: 'INR therapeutic if on warfarin; normal recovery'
      }
    ],
    longTerm: [
      {
        timeframe: 'Ongoing',
        expectation: 'Return to usual anticoagulation management'
      }
    ],
    functionalRecovery: 'Normal functional recovery expected if complications avoided.',
    cosmeticOutcome: 'Standard for surgery type.',
    successRate: 'With proper management, most patients navigate perioperative anticoagulation safely.',
    possibleComplications: [
      {
        complication: 'Bleeding',
        riskLevel: 'moderate',
        prevention: 'Proper timing of medication cessation',
        management: 'Observation, transfusion, return to OR if severe'
      },
      {
        complication: 'Thromboembolic event',
        riskLevel: 'moderate',
        prevention: 'Appropriate bridging, minimize anticoagulation gap',
        management: 'Anticoagulation, supportive care'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: 'As per surgery',
        purpose: 'Surgical follow-up'
      },
      {
        timing: '1 week',
        purpose: 'INR check if on warfarin'
      },
      {
        timing: 'As per anticoagulation clinic',
        purpose: 'Resume normal monitoring'
      }
    ],
    rehabilitationNeeds: [
      'Early mobilization',
      'Standard surgical rehabilitation',
      'Resume normal anticoagulation monitoring'
    ],
    lifestyleModifications: [
      'Continue anticoagulation as prescribed',
      'Wear medical alert bracelet',
      'Inform all healthcare providers about anticoagulation',
      'Regular monitoring as required'
    ]
  },

  warningSigns: [
    'Unusual bleeding or bruising',
    'Bleeding from wound',
    'Blood in urine or stool',
    'Severe headache',
    'Leg swelling or pain (possible DVT)',
    'Shortness of breath (possible PE)',
    'Weakness, speech problems (possible stroke)'
  ],

  emergencySigns: [
    'Severe bleeding',
    'Signs of stroke (sudden weakness, speech difficulty)',
    'Signs of pulmonary embolism (sudden shortness of breath, chest pain)',
    'Signs of heart attack'
  ],

  complianceRequirements: [
    {
      requirement: 'Stop and restart medications exactly as directed',
      importance: 'critical',
      consequence: 'Wrong timing causes bleeding or clots'
    },
    {
      requirement: 'Report any unusual bleeding immediately',
      importance: 'critical',
      consequence: 'Early intervention prevents serious bleeding'
    },
    {
      requirement: 'Report any symptoms of blood clots immediately',
      importance: 'critical',
      consequence: 'Early treatment of clots saves lives'
    },
    {
      requirement: 'Resume anticoagulation as directed',
      importance: 'critical',
      consequence: 'Extended gap increases clot risk'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Perioperative Anticoagulation',
      reference: 'WHO Surgical Safety Guidelines',
      keyPoints: [
        'Individualized risk assessment',
        'Balance bleeding and thrombotic risks',
        'Multidisciplinary planning',
        'Clear communication with patient',
        'Close monitoring perioperatively'
      ]
    }
  ]
};

/**
 * Immunosuppression and Surgery
 */
export const immunosuppressionAndSurgery: EducationCondition = {
  id: 'systemic-immunosuppression-surgery',
  name: 'Immunosuppression and Surgery',
  category: 'L',
  icdCode: 'D84.9',
  description: 'Surgical care for patients with weakened immune systems due to medications, disease, or treatment.',
  alternateNames: ['Immunocompromised Surgical Patient', 'Transplant Patient Surgery', 'Chemotherapy and Surgery'],
  
  overview: {
    definition: 'Immunosuppressed patients have weakened immune systems, making them more susceptible to infections and affecting wound healing. Immunosuppression can result from medications (transplant drugs, chemotherapy, steroids), diseases (HIV, leukemia), or treatments (radiation). These patients require special perioperative care including infection prevention, medication management, and close monitoring.',
    causes: [
      'Organ transplant recipients (on anti-rejection drugs)',
      'Chemotherapy for cancer',
      'Long-term corticosteroid use',
      'Autoimmune disease treatments (biologics, DMARDs)',
      'HIV/AIDS',
      'Leukemia and lymphoma',
      'Congenital immunodeficiency',
      'Bone marrow transplant'
    ],
    symptoms: [
      'Taking immunosuppressant medications',
      'History of frequent infections',
      'History of transplant',
      'Undergoing cancer treatment',
      'HIV positive',
      'Autoimmune disease on treatment'
    ],
    riskFactors: [
      'High-dose immunosuppression',
      'Multiple immunosuppressant agents',
      'Recent chemotherapy (nadir period)',
      'Low white blood cell count',
      'Poor nutritional status',
      'Diabetes',
      'Major surgery'
    ],
    complications: [
      'Surgical site infection (significantly higher risk)',
      'Poor wound healing',
      'Opportunistic infections',
      'Delayed recovery',
      'Organ rejection (transplant patients)',
      'Adrenal crisis (steroid-dependent patients)',
      'Neutropenic sepsis',
      'Reactivation of latent infections'
    ],
    prevalence: 'Immunosuppressed patients are increasingly common surgical candidates as transplant and cancer treatments improve.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Preoperative Assessment',
      duration: 'Weeks before surgery',
      description: 'Comprehensive assessment of immune status and optimization.',
      goals: [
        'Assess degree of immunosuppression',
        'Optimize timing if possible',
        'Screen for latent infections',
        'Plan medication management',
        'Coordinate with treating specialists'
      ],
      activities: [
        'Complete blood count with differential',
        'CD4 count if HIV positive',
        'Assessment of current immunosuppressive medications',
        'Screening for tuberculosis, hepatitis',
        'Consultation with transplant team/oncologist/rheumatologist',
        'Nutrition optimization',
        'Vaccination update if time permits'
      ],
      warningSignsThisPhase: [
        'Very low white blood cell count',
        'Active infection',
        'Recent organ rejection',
        'Unstable primary condition'
      ]
    },
    {
      phase: 2,
      name: 'Medication Management',
      duration: 'Days before surgery',
      description: 'Adjusting immunosuppressive medications for surgery.',
      goals: [
        'Balance infection/rejection risk',
        'Stress-dose steroids if needed',
        'Minimize infection risk',
        'Maintain stability of underlying condition'
      ],
      activities: [
        'Continue most immunosuppressants (discuss with team)',
        'Stress-dose steroids if on chronic steroids',
        'Hold certain biologics before major surgery',
        'Consider holding DMARDs briefly',
        'Antibiotic prophylaxis planning'
      ],
      medications: [
        {
          name: 'Corticosteroids (stress dosing)',
          purpose: 'Prevent adrenal crisis in chronic steroid users',
          duration: 'Increased dose day of surgery and short period after'
        },
        {
          name: 'Transplant medications',
          purpose: 'Usually continue to prevent rejection',
          duration: 'Continue unless advised otherwise'
        },
        {
          name: 'Biologics (e.g., infliximab, adalimumab)',
          purpose: 'Hold before major surgery',
          duration: 'Stop 2-4 weeks before depending on drug'
        },
        {
          name: 'Methotrexate',
          purpose: 'May hold briefly around surgery',
          duration: 'Discuss with rheumatologist'
        }
      ],
      warningSignsThisPhase: [
        'Flare of autoimmune condition',
        'Signs of infection developing',
        'Medication uncertainty'
      ]
    },
    {
      phase: 3,
      name: 'Perioperative Care',
      duration: 'Day of surgery',
      description: 'Extra infection prevention measures during surgery.',
      goals: [
        'Maximize infection prevention',
        'Continue necessary medications',
        'Stress-dose steroids',
        'Careful surgical technique'
      ],
      activities: [
        'IV stress-dose steroids (hydrocortisone)',
        'Extended antibiotic prophylaxis',
        'Meticulous aseptic technique',
        'Minimize operative time',
        'Consider less invasive options'
      ],
      warningSignsThisPhase: [
        'Hypotension (possible adrenal insufficiency)',
        'Signs of sepsis',
        'Poor tissue quality'
      ]
    },
    {
      phase: 4,
      name: 'Post-Operative Care',
      duration: 'Days to weeks',
      description: 'Intensive monitoring for infection and wound problems.',
      goals: [
        'Early detection of infection',
        'Promote wound healing',
        'Taper stress-dose steroids',
        'Resume normal medications',
        'Prevent opportunistic infections'
      ],
      activities: [
        'Close wound monitoring',
        'Daily temperature checks',
        'Watch for subtle infection signs',
        'Taper steroids to baseline',
        'Resume immunosuppressants',
        'Consider prophylactic antibiotics/antifungals',
        'Isolation precautions if neutropenic'
      ],
      medications: [
        {
          name: 'Extended antibiotic prophylaxis',
          purpose: 'Prevent surgical site infection',
          duration: 'May continue 24-48 hours (or longer in high-risk)'
        },
        {
          name: 'Stress-dose steroids taper',
          purpose: 'Gradual return to baseline',
          duration: '2-3 days typically'
        },
        {
          name: 'PCP prophylaxis (for severely immunosuppressed)',
          purpose: 'Prevent Pneumocystis pneumonia',
          duration: 'Continue if already on'
        }
      ],
      warningSignsThisPhase: [
        'Any fever (take very seriously)',
        'Wound problems',
        'Any signs of infection (may be subtle)',
        'Unusual symptoms'
      ]
    },
    {
      phase: 5,
      name: 'Recovery and Resumption',
      duration: 'Weeks to months',
      description: 'Complete recovery and return to usual immunosuppression management.',
      goals: [
        'Complete wound healing',
        'Resume all usual medications',
        'Monitor for delayed complications',
        'Return to normal function'
      ],
      activities: [
        'Resume biologics when wound healed (often 2-4 weeks)',
        'Normal follow-up with specialists',
        'Watch for late infections',
        'Complete rehabilitation'
      ],
      warningSignsThisPhase: [
        'Delayed wound healing',
        'Late infection',
        'Flare of underlying condition',
        'Organ rejection signs'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Surgeon',
      'Transplant team (if transplant patient)',
      'Oncologist (if cancer patient)',
      'Rheumatologist (if autoimmune disease)',
      'Infectious disease (if complex)',
      'HIV specialist (if HIV positive)'
    ],
    investigations: [
      'Complete blood count with differential',
      'CD4 count and viral load (if HIV)',
      'Liver and kidney function',
      'Hepatitis B and C screening',
      'TB testing (QuantiFERON)',
      'Chest X-ray'
    ],
    medications: [
      {
        medication: 'Corticosteroids',
        instruction: 'continue',
        reason: 'Never stop abruptly; stress dosing will be given'
      },
      {
        medication: 'Transplant medications',
        instruction: 'continue',
        reason: 'Continue to prevent rejection unless specifically advised'
      },
      {
        medication: 'Biologics',
        instruction: 'discuss',
        reason: 'Hold for major surgery; timing varies by drug'
      },
      {
        medication: 'Chemotherapy',
        instruction: 'discuss',
        reason: 'Timing of surgery relative to cycles is important'
      }
    ],
    fastingInstructions: 'Standard fasting instructions. Ensure medications are taken as directed.',
    dayBeforeSurgery: [
      'Take usual medications unless told otherwise',
      'Shower with antiseptic soap',
      'Watch for any signs of infection',
      'Report any concerns'
    ],
    whatToBring: [
      'All medications',
      'List of medications with doses',
      'Contact information for transplant team/oncologist/rheumatologist',
      'Hospital records from specialists'
    ],
    dayOfSurgery: [
      'Take approved medications',
      'Inform team of all immunosuppressants',
      'Report any new symptoms'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Any appropriate anesthesia; considerations for drug interactions',
    procedureDescription: 'Surgery proceeds with extra attention to infection prevention. Stress-dose steroids are given if patient is on chronic steroids. Extended antibiotic prophylaxis may be used. Minimal invasive approaches preferred when possible to reduce infection risk and promote faster healing.',
    duration: 'Varies by procedure',
    whatToExpect: 'Surgery proceeds with extra precautions. You will receive stress-dose steroids if on chronic steroids. Extra attention to sterile technique.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'As per surgery type',
      expectedSymptoms: [
        'Normal post-operative symptoms',
        'Close monitoring for infection',
        'May be in protective isolation if severely immunosuppressed'
      ],
      activityLevel: 'Mobilize as able to promote recovery'
    },
    woundCare: [
      {
        day: 'Daily',
        instruction: 'Careful wound inspection. Report ANY signs of infection immediately - redness, warmth, discharge, pain. May be subtle in immunosuppressed.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'As per surgery type',
      medications: [
        'Standard pain medications',
        'Avoid NSAIDs if kidney concerns',
        'Watch for interactions with immunosuppressants'
      ],
      nonPharmacological: [
        'Ice, elevation',
        'Positioning',
        'Distraction'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Avoid crowds and sick contacts',
        restriction: 'Minimize exposure',
        duration: 'During recovery',
        reason: 'Infection prevention'
      },
      {
        activity: 'As per surgery type',
        restriction: 'Follow surgical instructions',
        duration: 'As directed',
        reason: 'Normal surgical recovery'
      }
    ],
    dietaryGuidelines: [
      'Good nutrition for healing',
      'Avoid raw/undercooked foods if severely immunosuppressed',
      'Safe food handling',
      'Good hygiene when eating'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1-2 weeks',
        expectation: 'Wound healing progressing, no infection'
      }
    ],
    longTerm: [
      {
        timeframe: '4-6 weeks',
        expectation: 'Complete healing (may be slower than normal)'
      },
      {
        timeframe: 'Ongoing',
        expectation: 'Return to baseline immunosuppression management'
      }
    ],
    functionalRecovery: 'May be slower than in immunocompetent patients. Good outcomes with proper management.',
    cosmeticOutcome: 'Wound healing may be slower with more scarring.',
    successRate: 'With proper perioperative management, most immunosuppressed patients have successful surgery.',
    possibleComplications: [
      {
        complication: 'Surgical site infection',
        riskLevel: 'high',
        prevention: 'Sterile technique, prophylaxis, wound care',
        management: 'Early antibiotics, possible debridement'
      },
      {
        complication: 'Delayed wound healing',
        riskLevel: 'moderate',
        prevention: 'Good nutrition, minimize steroids if possible',
        management: 'Supportive wound care, nutrition'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: 'More frequent initially (every few days)',
        purpose: 'Wound checks, infection surveillance'
      },
      {
        timing: '2 weeks',
        purpose: 'Wound assessment'
      },
      {
        timing: 'As per surgery and specialists',
        purpose: 'Complete follow-up'
      }
    ],
    rehabilitationNeeds: [
      'Standard surgical rehabilitation',
      'May need slower progression',
      'Infection precautions during therapy'
    ],
    lifestyleModifications: [
      'Continue infection prevention measures',
      'Resume medications as directed',
      'Report any concerns promptly',
      'Maintain good nutrition'
    ]
  },

  warningSigns: [
    'Any fever (take very seriously)',
    'Wound redness, swelling, or discharge',
    'Increasing pain at wound',
    'Feeling generally unwell',
    'New symptoms anywhere',
    'Cough or respiratory symptoms'
  ],

  emergencySigns: [
    'High fever',
    'Signs of sepsis (confusion, rapid heart rate, low blood pressure)',
    'Severe wound infection',
    'Signs of organ rejection (transplant patients)'
  ],

  complianceRequirements: [
    {
      requirement: 'Report any signs of infection immediately',
      importance: 'critical',
      consequence: 'Infections progress rapidly in immunosuppressed patients'
    },
    {
      requirement: 'Continue immunosuppressants as directed',
      importance: 'critical',
      consequence: 'Stopping causes rejection or disease flare'
    },
    {
      requirement: 'Take stress-dose steroids as prescribed',
      importance: 'critical',
      consequence: 'Prevents life-threatening adrenal crisis'
    },
    {
      requirement: 'Attend all follow-up appointments',
      importance: 'critical',
      consequence: 'Early detection of problems in high-risk patient'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Immunocompromised Patients',
      reference: 'WHO Infection Prevention Guidelines',
      keyPoints: [
        'Multidisciplinary coordination essential',
        'Enhanced infection prevention measures',
        'Careful medication management',
        'Close post-operative monitoring',
        'Low threshold for investigating fever'
      ]
    }
  ]
};

// Export systemic conditions part 2
export const systemicConditionsPart2 = [anticoagulationAndSurgery, immunosuppressionAndSurgery];
