/**
 * Burns Educational Content - Part 2
 * Chemical Burns, Electrical Burns, Radiation Burns
 * Category A - Patient Education Module
 * AstroHEALTH Innovations in Healthcare
 */

import type { EducationCondition } from '../types';

export const burnsEducationPart2: EducationCondition[] = [
  // A3. Chemical Burns
  {
    id: 'burns-chemical',
    categoryId: 'A',
    name: 'Chemical Burns',
    alternateNames: ['Caustic burns', 'Acid burns', 'Alkali burns', 'Corrosive injuries'],
    icdCode: 'T20-T25',
    
    overview: {
      definition: 'Chemical burns are tissue injuries caused by exposure to corrosive substances including acids, alkalis, solvents, and other reactive chemicals. Unlike thermal burns, chemical burns continue causing damage until the chemical is completely removed or neutralized. Alkali burns are particularly dangerous as they penetrate deeper and longer than acid burns.',
      causes: [
        'Industrial accidents with acids or alkalis',
        'Household cleaning agents (bleach, drain cleaners, oven cleaners)',
        'Battery acid exposure',
        'Cement (contains calcium hydroxide - alkali)',
        'Assault with acid or other chemicals',
        'Agricultural chemicals and fertilizers',
        'Laboratory accidents'
      ],
      riskFactors: [
        'Occupational exposure (chemical industry, construction, cleaning)',
        'Improper handling or storage of chemicals',
        'Lack of personal protective equipment (PPE)',
        'Inadequate safety training',
        'Domestic abuse or assault',
        'Psychiatric conditions (self-harm)',
        'Children accessing household chemicals'
      ],
      symptoms: [
        'Immediate burning pain at contact site',
        'Skin discoloration - may be white, yellow, brown, or black',
        'Skin texture changes - may be leathery, soapy (alkali), or hard',
        'Blistering and tissue destruction',
        'Numbness (indicating deep injury)',
        'If ingested: mouth pain, drooling, difficulty swallowing',
        'If inhaled: cough, shortness of breath, respiratory distress'
      ],
      diagnosis: [
        'History of chemical exposure - identify the specific agent',
        'Clinical examination to assess burn depth and extent',
        'Assessment for systemic toxicity',
        'Blood tests including electrolytes, renal function',
        'Chest X-ray if inhalation suspected',
        'Ophthalmology review if eye exposure',
        'Contact poison control center for guidance'
      ],
      classification: [
        {
          name: 'Types of Chemical Burns by Agent',
          description: 'Different chemicals cause different patterns of injury',
          grades: [
            { grade: 'Acid Burns', description: 'Hydrochloric, sulfuric, nitric acid', characteristics: ['Coagulation necrosis', 'Eschar limits penetration', 'Usually less deep', 'Obvious tissue damage'] },
            { grade: 'Alkali Burns', description: 'Sodium/potassium hydroxide, lime, cement', characteristics: ['Liquefactive necrosis', 'Continues penetrating', 'Often deeper than appears', 'Soapy skin texture'] },
            { grade: 'Organic Compound Burns', description: 'Phenols, petroleum products', characteristics: ['May cause systemic toxicity', 'Skin necrosis', 'Absorption through skin', 'Require specific antidotes'] }
          ]
        }
      ],
      epidemiology: 'Chemical burns account for 3-5% of burn center admissions. Industrial settings are the most common site. Mortality is lower than thermal burns of similar size but morbidity can be significant.',
      prognosis: 'Depends on chemical type, concentration, duration of contact, and area affected. Alkali burns generally have worse prognosis than acid burns. Early and complete decontamination improves outcomes significantly.'
    },
    
    treatmentPhases: [
      {
        phase: 1,
        name: 'Immediate Decontamination (0-6 hours)',
        duration: '0-6 hours',
        description: 'Rapid removal of the chemical is the single most important intervention. Water irrigation should begin immediately and continue for extended periods.',
        goals: [
          'Remove all clothing and contaminated items',
          'Begin immediate copious water irrigation',
          'Protect healthcare workers from exposure',
          'Identify the specific chemical if possible',
          'Assess for systemic absorption'
        ],
        interventions: [
          'Copious water irrigation for minimum 30-60 minutes (2-4 hours for alkalis)',
          'Remove all contaminated clothing, jewelry, contact lenses',
          'Brush off dry chemicals before water irrigation',
          'Do NOT use neutralizing agents (cause exothermic reaction)',
          'Eye irrigation with saline or water for 30+ minutes if eye exposure',
          'IV access and fluid resuscitation for extensive burns',
          'Antidotes if available (e.g., calcium gluconate gel for hydrofluoric acid)'
        ],
        milestones: [
          'Complete decontamination achieved',
          'Pain beginning to reduce',
          'No ongoing chemical reaction',
          'Systemic effects assessed and managed'
        ],
        nursingCare: [
          'Wear appropriate PPE (gloves, gown, eye protection)',
          'Continuous irrigation until pH neutral (test with litmus paper)',
          'Monitor for signs of systemic toxicity',
          'Careful disposal of contaminated materials',
          'Documentation of chemical, concentration, contact time'
        ]
      },
      {
        phase: 2,
        name: 'Acute Management Phase (6 hours - 2 weeks)',
        duration: '6 hours to 2 weeks',
        description: 'Wound assessment, infection prevention, and planning for surgical intervention if needed.',
        goals: [
          'Assess true depth of injury (may take 24-48 hours to declare)',
          'Prevent wound infection',
          'Manage pain',
          'Nutritional support',
          'Plan surgical debridement and grafting'
        ],
        interventions: [
          'Daily wound assessment - depth may increase for 48-72 hours',
          'Wound dressings appropriate for burn depth',
          'Topical antimicrobials',
          'Early surgical debridement once wound stabilized',
          'Skin grafting for full-thickness injuries',
          'Physiotherapy to prevent contractures'
        ],
        milestones: [
          'Wound depth stabilized and declared',
          'Surgical plan established',
          'Pain controlled',
          'No infection'
        ]
      },
      {
        phase: 3,
        name: 'Reconstruction and Rehabilitation (2 weeks onwards)',
        duration: '2 weeks to 2+ years',
        description: 'Wound healing, scar management, and functional rehabilitation.',
        goals: [
          'Complete wound closure',
          'Minimize scarring',
          'Restore function',
          'Psychological support'
        ],
        interventions: [
          'Skin grafting if required',
          'Pressure garment therapy',
          'Silicone gel for scar management',
          'Intensive physiotherapy',
          'Reconstructive surgery for contractures',
          'Psychological counseling'
        ],
        milestones: [
          'All wounds healed',
          'Functional recovery achieved',
          'Scar maturation',
          'Return to normal activities'
        ]
      }
    ],
    
    preoperativeInstructions: {
      consultations: [
        'Plastic/burn surgery evaluation',
        'Toxicology if systemic exposure',
        'Ophthalmology if eye involvement',
        'Pulmonology if inhalation injury'
      ],
      investigations: [
        'Full blood count',
        'Urea, electrolytes, creatinine',
        'Liver function tests',
        'Blood gas if systemic involvement',
        'ECG for cardiac-toxic chemicals',
        'Specific tests based on chemical (e.g., calcium levels for hydrofluoric acid)'
      ],
      medications: [
        { medication: 'Anticoagulants', instruction: 'stop', timing: 'As directed', reason: 'Bleeding risk during surgery' },
        { medication: 'Antidotes if applicable', instruction: 'continue', reason: 'Treat ongoing toxicity' }
      ],
      dietaryRestrictions: ['Nil by mouth 6 hours before surgery'],
      physicalPreparation: [
        'Ensure complete decontamination',
        'Optimize hydration',
        'Correct any electrolyte abnormalities'
      ],
      psychologicalPreparation: [
        'Explain surgical plan',
        'Discuss expected outcomes',
        'Address concerns about scarring'
      ],
      consentRequirements: [
        'Consent for debridement and grafting',
        'Blood transfusion consent',
        'Photography consent',
        'Risks discussion'
      ],
      dayBeforeSurgery: ['Fasting instructions', 'Medication review', 'Prepare for hospital stay'],
      dayOfSurgery: ['Fasting', 'Essential medications only', 'Arrive at scheduled time']
    },
    
    intraoperativeInfo: {
      anesthesiaType: ['General anesthesia most common', 'Regional anesthesia for limited areas'],
      procedureDescription: 'Surgical debridement removes all damaged tissue. Chemical burn wounds may have irregular margins and require wider excision than initially apparent. Skin grafting provides wound coverage.',
      procedureSteps: [
        'Complete wound debridement',
        'Assessment of wound bed viability',
        'Hemostasis',
        'Skin graft harvesting',
        'Graft application',
        'Dressing application'
      ],
      duration: '1-4 hours depending on extent',
      techniques: ['Excision and grafting', 'May need staged procedures'],
      expectedBloodLoss: 'Moderate; blood transfusion may be required',
      possibleComplications: ['Graft failure', 'Infection', 'Ongoing tissue necrosis', 'Scarring']
    },
    
    postoperativeInstructions: {
      immediatePostop: {
        monitoring: ['Vital signs', 'Graft site observation', 'Pain levels', 'Signs of systemic toxicity'],
        positioning: 'Elevate affected areas. Protect graft sites.',
        fluidManagement: 'IV fluids until eating well',
        painControl: 'Regular analgesia',
        expectedSymptoms: ['Pain', 'Swelling', 'Drainage initially'],
        nursingInstructions: ['Monitor wounds', 'Infection surveillance', 'Dressing care']
      },
      woundCare: [
        { day: 'Days 1-5', instruction: 'Leave primary dressing undisturbed unless indicated', frequency: 'As directed' },
        { day: 'Days 5-7', instruction: 'First graft inspection', frequency: 'As scheduled' },
        { day: 'Weeks 2-4', instruction: 'Continue wound care until healed', frequency: 'Per instructions' }
      ],
      painManagement: {
        expectedPainLevel: 'Moderate to severe initially',
        medications: ['Paracetamol', 'NSAIDs if no contraindication', 'Opioids for breakthrough'],
        nonPharmacological: ['Elevation', 'Distraction', 'Cool environment'],
        whenToSeekHelp: 'Uncontrolled pain, increasing pain with fever'
      },
      activityRestrictions: [
        { activity: 'Affected area use', restriction: 'Limited', duration: '2-4 weeks', reason: 'Graft protection' }
      ],
      dietaryGuidelines: ['High protein for healing', 'Adequate fluids', 'Vitamin C and zinc supplementation'],
      medicationRegimen: [
        { name: 'Paracetamol', dose: '1g', frequency: 'Every 6 hours', purpose: 'Pain relief' },
        { name: 'Antibiotics if prescribed', dose: 'As directed', frequency: 'As directed', purpose: 'Prevent infection' }
      ],
      physicalTherapy: {
        startTiming: 'Within 48 hours',
        frequency: 'Daily',
        exercises: [{ name: 'Range of motion', description: 'Gentle movements of all joints', frequency: '3-4 times daily' }],
        precautions: ['Protect grafts', 'Stop if excessive pain'],
        goals: ['Prevent contractures', 'Maintain function']
      },
      returnToWork: '2-6 weeks depending on injury extent and occupation',
      returnToNormalActivities: '4-12 weeks'
    },
    
    expectedOutcomes: {
      shortTerm: [
        { timeframe: '2-4 weeks', expectation: 'Wound closure', indicators: ['Grafts healed', 'No infection'] }
      ],
      longTerm: [
        { timeframe: '1-2 years', expectation: 'Scar maturation', indicators: ['Soft scars', 'Function restored'] }
      ],
      functionalRecovery: 'Most patients achieve good function with proper care. Hand burns may have longer rehabilitation.',
      cosmeticOutcome: 'Scarring expected. Results improve over time. Reconstruction may be needed.',
      qualityOfLife: 'Generally good with proper rehabilitation.',
      possibleComplications: [
        { complication: 'Contracture', riskLevel: 'moderate', prevention: 'Early therapy', management: 'Surgery if severe' }
      ],
      successRate: 'Good outcomes with early treatment. Alkali burns have higher complication rates.'
    },
    
    followUpCare: {
      schedule: [
        { timing: '1 week', purpose: 'Wound check', whatToExpect: 'Graft assessment' },
        { timing: '4 weeks', purpose: 'Healing confirmation', whatToExpect: 'Start scar management' },
        { timing: '3-6 months', purpose: 'Rehabilitation review', whatToExpect: 'Functional assessment' }
      ],
      ongoingMonitoring: ['Scar progression', 'Function', 'Psychological wellbeing'],
      rehabilitationNeeds: ['Physiotherapy', 'Pressure garments', 'Scar management'],
      supportServices: ['Occupational health if work-related', 'Psychological support'],
      longTermConsiderations: ['Ongoing scar management', 'Possible reconstruction']
    },
    
    complianceRequirements: [
      { requirement: 'Complete decontamination immediately', importance: 'critical', consequence: 'Ongoing tissue damage', tips: ['Irrigate for minimum 30 minutes', 'Remove all contaminated items'] },
      { requirement: 'Pressure garments', importance: 'critical', consequence: 'Hypertrophic scarring', tips: ['Wear 23 hours/day'] },
      { requirement: 'Follow-up appointments', importance: 'critical', consequence: 'Missed complications', tips: ['Keep all appointments'] }
    ],
    
    whoGuidelines: [
      {
        title: 'WHO Chemical Burns Guidelines',
        reference: 'WHO Emergency Care Guidelines',
        keyPoints: [
          'Immediate copious water irrigation is critical',
          'Do not use neutralizing agents',
          'Remove all contaminated clothing',
          'Seek specialist care for extensive burns'
        ]
      }
    ],
    
    warningSigns: ['Increasing pain', 'Spreading redness', 'Discharge from wounds', 'Fever'],
    emergencySigns: ['Difficulty breathing if inhalation', 'Severe systemic symptoms', 'Chest pain', 'Confusion']
  },
  
  // A4. Electrical Burns
  {
    id: 'burns-electrical',
    categoryId: 'A',
    name: 'Electrical Burns',
    alternateNames: ['Electrocution injury', 'High-voltage injury', 'Low-voltage burn', 'Lightning injury'],
    icdCode: 'T75.4',
    
    overview: {
      definition: 'Electrical burns result from electrical current passing through the body, causing injury at entry and exit points and along the current pathway. The severity depends on voltage, current type (AC or DC), duration of contact, pathway through body, and resistance of tissues. Electrical injuries often cause deep tissue damage that is not visible on the skin surface.',
      causes: [
        'High-voltage industrial accidents',
        'Low-voltage household electrical accidents',
        'Lightning strikes',
        'Faulty electrical appliances',
        'Power line contact',
        'Illegal electrical connections',
        'Children chewing electrical cords'
      ],
      riskFactors: [
        'Electrical workers without proper PPE',
        'Faulty wiring in homes',
        'Working with water and electricity',
        'Outdoor activities in lightning storms',
        'Children with access to electrical outlets',
        'Rural areas with informal electricity connections'
      ],
      symptoms: [
        'Entry and exit wounds (may be small despite severe internal injury)',
        'Muscle pain and weakness',
        'Numbness or tingling',
        'Difficulty moving affected limbs',
        'Cardiac arrhythmias',
        'Confusion or altered consciousness',
        'Burns along current pathway',
        'Broken bones from muscle contractions or falls'
      ],
      diagnosis: [
        'History of electrical exposure - voltage, duration, current type',
        'Identify entry and exit points',
        'ECG - mandatory for all electrical injuries',
        'Cardiac monitoring for 24-48 hours',
        'Full blood count, electrolytes, renal function',
        'Creatine kinase (muscle damage marker)',
        'Urinalysis for myoglobin',
        'Imaging if trauma suspected'
      ],
      classification: [
        {
          name: 'Voltage Classification',
          description: 'Electrical injuries classified by voltage level',
          grades: [
            { grade: 'Low Voltage', description: '<1000 volts', characteristics: ['Usually household current', 'Local tissue damage', 'Cardiac effects possible', 'Generally better prognosis'] },
            { grade: 'High Voltage', description: '>1000 volts', characteristics: ['Industrial/power lines', 'Severe deep tissue damage', 'High amputation risk', 'Often fatal'] },
            { grade: 'Lightning', description: 'Very high voltage, brief duration', characteristics: ['Often multiple victims', 'Cardiac arrest common', 'Unique injury patterns', 'Variable outcomes'] }
          ]
        }
      ],
      epidemiology: 'Electrical burns account for 3-5% of burn admissions but have disproportionately high morbidity due to deep tissue injury. Young males in occupational settings are most commonly affected.',
      prognosis: 'Surface injuries are often misleading - internal damage may be extensive. Limb loss rates are high in high-voltage injuries. Cardiac complications may be immediate or delayed.'
    },
    
    treatmentPhases: [
      {
        phase: 1,
        name: 'Emergency Phase (0-48 hours)',
        duration: '0-48 hours',
        description: 'Resuscitation, cardiac monitoring, assessment of hidden injuries.',
        goals: [
          'Ensure patient is disconnected from electrical source',
          'Basic life support if needed',
          'Cardiac monitoring for arrhythmias',
          'Assess for associated trauma',
          'Aggressive fluid resuscitation',
          'Assess compartments for pressure'
        ],
        interventions: [
          'CPR if cardiac arrest (common in electrical injuries)',
          'Continuous ECG monitoring for 24-48 hours',
          'Fluid resuscitation - often need more than Parkland formula due to hidden muscle damage',
          'Fasciotomy for compartment syndrome',
          'Tetanus prophylaxis',
          'Pain management'
        ],
        milestones: [
          'Stable cardiac rhythm',
          'Adequate urine output (target 1-1.5ml/kg/hr to prevent myoglobin damage)',
          'No compartment syndrome',
          'Full injury assessment completed'
        ],
        nursingCare: [
          'Continuous cardiac monitoring',
          'Hourly urine output - note color (dark suggests myoglobinuria)',
          'Neurovascular checks',
          'Monitor for delayed arrhythmias'
        ]
      },
      {
        phase: 2,
        name: 'Surgical Phase (48 hours - 4 weeks)',
        duration: '48 hours to 4 weeks',
        description: 'Debridement of necrotic tissue, fasciotomies, possible amputation, wound coverage.',
        goals: [
          'Remove all non-viable tissue',
          'Prevent infection',
          'Preserve viable tissue and limbs',
          'Achieve wound coverage'
        ],
        interventions: [
          'Serial debridements (tissue viability may declare over days)',
          'Fasciotomy for compartment syndrome',
          'Amputation if limb not salvageable',
          'Skin grafting for soft tissue coverage',
          'Flap coverage for exposed vital structures'
        ],
        milestones: [
          'All necrotic tissue removed',
          'Viable tissue preserved',
          'Wounds covered or healing'
        ]
      },
      {
        phase: 3,
        name: 'Rehabilitation Phase (4 weeks onwards)',
        duration: '4 weeks to years',
        description: 'Functional rehabilitation, prosthetics if needed, psychological support.',
        goals: [
          'Maximize function',
          'Prosthetic fitting if amputation',
          'Address neurological deficits',
          'Psychological adjustment'
        ],
        interventions: [
          'Intensive physiotherapy',
          'Occupational therapy',
          'Prosthetic rehabilitation',
          'Nerve and muscle rehabilitation',
          'Psychological counseling',
          'Vocational rehabilitation'
        ],
        milestones: [
          'Maximum functional recovery',
          'Prosthetic proficiency',
          'Return to work if possible'
        ]
      }
    ],
    
    preoperativeInstructions: {
      consultations: [
        'Burn/plastic surgery',
        'Cardiology for cardiac monitoring',
        'Orthopedics if fractures',
        'Neurology if nerve involvement'
      ],
      investigations: [
        'ECG and cardiac enzymes',
        'Creatine kinase (CK) levels',
        'Urea, creatinine, electrolytes',
        'Full blood count and coagulation',
        'Urinalysis for myoglobin',
        'X-rays if fractures suspected',
        'Angiography if vascular injury suspected'
      ],
      medications: [
        { medication: 'Blood thinners', instruction: 'stop', timing: 'As directed', reason: 'Bleeding risk' },
        { medication: 'Cardiac medications', instruction: 'continue', reason: 'Maintain cardiac stability' }
      ],
      dietaryRestrictions: ['Nil by mouth 6 hours before surgery'],
      physicalPreparation: ['Optimize hydration to protect kidneys', 'Correct any electrolyte abnormalities'],
      psychologicalPreparation: ['Explain potential outcomes including possible amputation', 'Provide psychological support'],
      consentRequirements: ['Debridement consent', 'Possible amputation consent', 'Blood transfusion', 'Risks including limb loss'],
      dayBeforeSurgery: ['Continue monitoring', 'Prepare blood products'],
      dayOfSurgery: ['Fasting', 'Essential medications', 'Cardiac monitoring continues']
    },
    
    intraoperativeInfo: {
      anesthesiaType: ['General anesthesia'],
      procedureDescription: 'Exploration of entry and exit wounds, fasciotomy if needed, debridement of non-viable tissue, possible amputation. Tissue viability may be difficult to assess and serial operations may be needed.',
      procedureSteps: [
        'Exploration of wounds',
        'Fasciotomy if compartment syndrome',
        'Debridement of necrotic muscle and tissue',
        'Amputation if non-viable limb',
        'Vascular repair if indicated',
        'Temporary or definitive wound coverage'
      ],
      duration: '2-6 hours',
      techniques: ['Fasciotomy', 'Serial debridement', 'Amputation', 'Skin grafting', 'Flap coverage'],
      expectedBloodLoss: 'Can be significant; blood transfusion usually required',
      possibleComplications: ['Ongoing tissue necrosis', 'Infection', 'Need for amputation', 'Cardiac arrhythmias', 'Renal failure from myoglobin']
    },
    
    postoperativeInstructions: {
      immediatePostop: {
        monitoring: ['Continuous cardiac monitoring', 'Hourly urine output', 'Neurovascular status', 'CK levels'],
        positioning: 'Elevate affected limbs',
        fluidManagement: 'Aggressive fluids to maintain urine output >1ml/kg/hr and clear urine',
        painControl: 'Multimodal analgesia; often need strong opioids',
        expectedSymptoms: ['Significant pain', 'Swelling', 'Muscle weakness'],
        nursingInstructions: ['Monitor for compartment syndrome', 'Watch for arrhythmias', 'Track urine color and output']
      },
      woundCare: [
        { day: 'Days 1-3', instruction: 'Monitor wounds; may need repeat surgery as tissue declares', frequency: 'Daily assessment' },
        { day: 'Days 3-14', instruction: 'Continue wound care; serial debridements as needed', frequency: 'Per surgical plan' }
      ],
      painManagement: {
        expectedPainLevel: 'Severe initially',
        medications: ['Strong opioids', 'Gabapentin for neuropathic pain', 'Paracetamol'],
        nonPharmacological: ['Positioning', 'Support', 'Distraction'],
        whenToSeekHelp: 'Uncontrolled pain, new numbness or weakness'
      },
      activityRestrictions: [
        { activity: 'Activity', restriction: 'Bed rest initially', duration: 'Until stable', reason: 'Cardiac monitoring, tissue protection' }
      ],
      dietaryGuidelines: ['High protein, high calorie diet', 'Adequate hydration to protect kidneys'],
      medicationRegimen: [
        { name: 'Analgesia', dose: 'As prescribed', frequency: 'Regular', purpose: 'Pain control' },
        { name: 'Mannitol/bicarbonate if indicated', dose: 'Per protocol', frequency: 'As directed', purpose: 'Protect kidneys from myoglobin' }
      ],
      physicalTherapy: {
        startTiming: 'As soon as stable',
        frequency: 'Daily',
        exercises: [{ name: 'Range of motion', description: 'Gentle movements', frequency: 'Multiple times daily' }],
        precautions: ['Cardiac precautions', 'Avoid strain on wounds'],
        goals: ['Maintain function', 'Prevent contractures']
      },
      returnToWork: 'Highly variable; depends on injuries. May be months to permanent disability.',
      returnToNormalActivities: 'Variable based on extent of injuries'
    },
    
    expectedOutcomes: {
      shortTerm: [
        { timeframe: '1-4 weeks', expectation: 'Wound stabilization', indicators: ['No further tissue necrosis', 'Wounds healing'] }
      ],
      longTerm: [
        { timeframe: 'Months to years', expectation: 'Maximum functional recovery', indicators: ['Optimal function achieved', 'Prosthetic use if applicable'] }
      ],
      functionalRecovery: 'Depends on extent of injury. Nerve and muscle damage may limit recovery. Amputation may be necessary.',
      cosmeticOutcome: 'Entry and exit wounds may scar. Amputation sites require rehabilitation.',
      qualityOfLife: 'Variable. Many patients return to good function; those with amputations require significant adjustment.',
      possibleComplications: [
        { complication: 'Limb loss', riskLevel: 'high', prevention: 'Early fasciotomy, good resuscitation', management: 'Prosthetics, rehabilitation' },
        { complication: 'Cardiac arrhythmias', riskLevel: 'moderate', prevention: 'Monitoring for 24-48 hours', management: 'Antiarrhythmics, cardioversion if needed' },
        { complication: 'Renal failure', riskLevel: 'moderate', prevention: 'Aggressive fluids, alkalinization', management: 'Dialysis if needed' },
        { complication: 'Neurological deficits', riskLevel: 'moderate', prevention: 'None specific', management: 'Rehabilitation' }
      ],
      successRate: 'Survival depends on initial cardiac event. Limb salvage rates lower in high-voltage injuries. Long-term neurological sequelae are common.'
    },
    
    followUpCare: {
      schedule: [
        { timing: '1-2 weeks', purpose: 'Wound assessment, serial debridement', whatToExpect: 'Possible further surgery' },
        { timing: '6 weeks', purpose: 'Healing assessment', whatToExpect: 'Rehabilitation plan' },
        { timing: '3-6 months', purpose: 'Functional review', whatToExpect: 'Prosthetics if applicable' },
        { timing: 'Ongoing', purpose: 'Long-term monitoring', whatToExpect: 'Check for late complications' }
      ],
      ongoingMonitoring: ['Cardiac status', 'Neurological function', 'Psychological wellbeing'],
      rehabilitationNeeds: ['Physiotherapy', 'Occupational therapy', 'Prosthetic training', 'Vocational rehabilitation'],
      supportServices: ['Disability services', 'Psychological support', 'Occupational health'],
      longTermConsiderations: ['Cataracts may develop (requires ophthalmology follow-up)', 'Neurological changes', 'Cardiac monitoring', 'Psychological adjustment']
    },
    
    complianceRequirements: [
      { requirement: 'Complete cardiac monitoring period', importance: 'critical', consequence: 'Missed fatal arrhythmia', tips: ['Stay in monitored bed as instructed'] },
      { requirement: 'Maintain hydration', importance: 'critical', consequence: 'Kidney damage from myoglobin', tips: ['Drink fluids as instructed', 'Report dark urine'] },
      { requirement: 'Rehabilitation attendance', importance: 'critical', consequence: 'Poor functional outcome', tips: ['Attend all sessions', 'Practice at home'] }
    ],
    
    whoGuidelines: [
      {
        title: 'WHO Electrical Injury Guidelines',
        reference: 'WHO Emergency Care',
        keyPoints: [
          'Do not touch victim until disconnected from power source',
          'CPR immediately if cardiac arrest',
          'All electrical injuries need ECG monitoring',
          'Surface wounds may not reflect internal damage'
        ]
      }
    ],
    
    warningSigns: ['Palpitations or irregular heartbeat', 'Increasing weakness', 'Dark urine', 'Worsening pain', 'Numbness spreading'],
    emergencySigns: ['Chest pain', 'Difficulty breathing', 'Collapse', 'Severe weakness', 'No urine output']
  }
];

export default burnsEducationPart2;
