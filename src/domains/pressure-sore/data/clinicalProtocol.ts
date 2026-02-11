// ============================================
// Pressure Sore Management Module
// WHO-Adapted Clinical Protocol Data
// NPUAP/EPUAP/PPPIA International Guidelines
// ============================================

import type { PSEducationContent } from '../types';

// ============================================
// PRESSURE ULCER STAGING - NPUAP/EPUAP Classification
// ============================================
export const PRESSURE_ULCER_STAGES = [
  {
    stage: 'Stage 1',
    code: 'stage_1',
    name: 'Non-Blanchable Erythema',
    description: 'Intact skin with non-blanchable redness of a localized area usually over a bony prominence',
    clinicalFeatures: [
      'Intact skin with non-blanchable erythema',
      'May appear differently in darkly pigmented skin (purple/maroon discoloration)',
      'Area may be painful, firm, soft, warmer or cooler compared to adjacent tissue',
      'Blanching erythema or changes in sensation, temperature, or firmness may precede visual changes',
    ],
    differentials: ['Moisture-associated skin damage (MASD)', 'Reactive hyperemia (blanches)', 'Deep tissue pressure injury'],
    management: 'Pressure relief, repositioning schedule, skin assessment, moisture management',
    healingExpectation: '1-2 weeks with appropriate pressure relief',
  },
  {
    stage: 'Stage 2',
    code: 'stage_2',
    name: 'Partial Thickness Skin Loss',
    description: 'Partial-thickness loss of dermis presenting as a shallow open ulcer with a red-pink wound bed',
    clinicalFeatures: [
      'Shallow open ulcer with red/pink wound bed',
      'No slough present',
      'May present as intact or ruptured serum-filled blister',
      'Shiny, dry, shallow without slough or bruising',
    ],
    differentials: ['Skin tear', 'Tape burn', 'Medical adhesive-related skin injury', 'Incontinence-associated dermatitis'],
    management: 'Moist wound healing dressings, pressure redistribution, nutritional support',
    healingExpectation: '2-4 weeks',
  },
  {
    stage: 'Stage 3',
    code: 'stage_3',
    name: 'Full Thickness Skin Loss',
    description: 'Full-thickness skin loss. Subcutaneous fat may be visible but bone, tendon, and muscle are not exposed',
    clinicalFeatures: [
      'Full-thickness tissue loss',
      'Subcutaneous fat may be visible',
      'Slough may be present but does not obscure depth',
      'May include undermining and tunneling',
      'Bone, tendon, muscle NOT exposed',
      'Depth varies by anatomical location',
    ],
    differentials: ['Stage 4 (deeper)', 'Unstageable (if slough obscures base)'],
    management: 'Wound bed preparation, debridement if needed, NPWT consideration, surgical consult',
    healingExpectation: '1-4 months',
  },
  {
    stage: 'Stage 4',
    code: 'stage_4',
    name: 'Full Thickness Tissue Loss',
    description: 'Full-thickness tissue loss with exposed bone, tendon, or muscle. Slough or eschar may be present.',
    clinicalFeatures: [
      'Full-thickness tissue loss with exposed bone, tendon, or muscle',
      'Slough or eschar may be present on some parts of wound bed',
      'Often includes undermining and tunneling',
      'Can extend into muscle and/or supporting structures (fascia, tendon, joint capsule)',
      'Osteomyelitis risk with bone exposure',
    ],
    differentials: ['Osteomyelitis', 'Pathological fracture', 'Malignant transformation'],
    management: 'Surgical debridement, NPWT, bone cultures if exposed, flap coverage consideration',
    healingExpectation: 'Months to years; may require surgical closure',
  },
  {
    stage: 'Unstageable',
    code: 'unstageable',
    name: 'Unstageable / Obscured',
    description: 'Full-thickness tissue loss where base is covered by slough and/or eschar',
    clinicalFeatures: [
      'Base completely covered by slough (yellow, tan, gray, green, brown) and/or eschar (tan, brown, black)',
      'True depth cannot be determined until enough slough/eschar removed',
      'Stable eschar on heels should NOT be removed (serves as natural biological cover)',
    ],
    differentials: ['Stable heel eschar (leave intact)', 'Stage 3 or 4 under slough'],
    management: 'Debridement to determine depth (except stable heel eschar), wound bed preparation',
    healingExpectation: 'Cannot determine until staged after debridement',
  },
  {
    stage: 'DTPI',
    code: 'dtpi',
    name: 'Deep Tissue Pressure Injury',
    description: 'Persistent non-blanchable deep red, maroon or purple discoloration, or epidermal separation revealing a dark wound bed or blood-filled blister',
    clinicalFeatures: [
      'Intact or non-intact skin with localized area of persistent non-blanchable deep red, maroon, purple discoloration',
      'Epidermal separation revealing dark wound bed or blood-filled blister',
      'May be preceded by pain and temperature change',
      'May evolve rapidly to reveal actual extent of tissue injury',
      'Dark-skinned individuals may be more difficult to detect',
    ],
    differentials: ['Stage 1 pressure injury', 'Bruising from trauma', 'Peripheral vascular disease changes'],
    management: 'Aggressive pressure relief, monitor evolution closely, avoid additional pressure, serial photography',
    healingExpectation: 'May resolve or may rapidly evolve to Stage 3/4 within 48-72 hours',
  },
];

// ============================================
// BRADEN SCALE SCORING GUIDE
// ============================================
export const BRADEN_SCALE_GUIDE = {
  domains: [
    {
      name: 'Sensory Perception',
      description: 'Ability to respond meaningfully to pressure-related discomfort',
      scores: [
        { value: 1, label: 'Completely Limited', description: 'Unresponsive to painful stimuli. Limited ability to feel pain over most of body surface.' },
        { value: 2, label: 'Very Limited', description: 'Responds only to painful stimuli. Cannot communicate discomfort except by moaning or restlessness.' },
        { value: 3, label: 'Slightly Limited', description: 'Responds to verbal commands. Has some sensory impairment limiting ability to feel pain in one or two extremities.' },
        { value: 4, label: 'No Impairment', description: 'Responds to verbal commands. Has no sensory deficit limiting ability to feel or voice pain.' },
      ],
    },
    {
      name: 'Moisture',
      description: 'Degree to which skin is exposed to moisture',
      scores: [
        { value: 1, label: 'Constantly Moist', description: 'Skin is kept moist almost constantly by perspiration, urine, etc. Dampness detected every time patient is moved or turned.' },
        { value: 2, label: 'Very Moist', description: 'Skin is often, but not always moist. Linen must be changed at least once a shift.' },
        { value: 3, label: 'Occasionally Moist', description: 'Skin is occasionally moist, requiring extra linen change approximately once a day.' },
        { value: 4, label: 'Rarely Moist', description: 'Skin is usually dry; linen only requires changing at routine intervals.' },
      ],
    },
    {
      name: 'Activity',
      description: 'Degree of physical activity',
      scores: [
        { value: 1, label: 'Bedfast', description: 'Confined to bed.' },
        { value: 2, label: 'Chairfast', description: 'Ability to walk severely limited or non-existent. Cannot bear own weight and/or must be assisted into chair or wheelchair.' },
        { value: 3, label: 'Walks Occasionally', description: 'Walks occasionally during day, but for very short distances. Spends majority of each shift in bed or chair.' },
        { value: 4, label: 'Walks Frequently', description: 'Walks outside room at least twice a day and inside room at least once every 2 hours during waking hours.' },
      ],
    },
    {
      name: 'Mobility',
      description: 'Ability to change and control body position',
      scores: [
        { value: 1, label: 'Completely Immobile', description: 'Does not make even slight changes in body or extremity position without assistance.' },
        { value: 2, label: 'Very Limited', description: 'Makes occasional slight changes in body or extremity position but unable to make frequent or significant changes independently.' },
        { value: 3, label: 'Slightly Limited', description: 'Makes frequent though slight changes in body or extremity position independently.' },
        { value: 4, label: 'No Limitations', description: 'Makes major and frequent changes in position without assistance.' },
      ],
    },
    {
      name: 'Nutrition',
      description: 'Usual food intake pattern',
      scores: [
        { value: 1, label: 'Very Poor', description: 'Never eats a complete meal. Rarely eats more than 1/3 of any food offered. Eats 2 servings or less of protein per day.' },
        { value: 2, label: 'Probably Inadequate', description: 'Rarely eats a complete meal. Generally eats only about half of any food offered. Protein intake includes only 3 servings of meat or dairy per day.' },
        { value: 3, label: 'Adequate', description: 'Eats over half of most meals. Eats a total of 4 servings of protein per day.' },
        { value: 4, label: 'Excellent', description: 'Eats most of every meal. Never refuses a meal. Usually eats a total of 4 or more servings of protein per day.' },
      ],
    },
    {
      name: 'Friction & Shear',
      description: 'Movement of patient against support surfaces',
      scores: [
        { value: 1, label: 'Problem', description: 'Requires moderate to maximum assistance in moving. Complete lifting without sliding against sheets is impossible. Frequently slides down in bed or chair.' },
        { value: 2, label: 'Potential Problem', description: 'Moves feebly or requires minimum assistance. During a move, skin probably slides to some extent against sheets, chair, restraints, or other devices.' },
        { value: 3, label: 'No Apparent Problem', description: 'Moves in bed and in chair independently. Has sufficient muscle strength to lift up completely during move.' },
      ],
    },
  ],
  interpretation: [
    { range: '≤ 9', level: 'Very High Risk', color: '#DC2626', action: 'Every 1 hour repositioning. Specialized pressure redistribution surface. Intensive skin care.' },
    { range: '10–12', level: 'High Risk', color: '#EA580C', action: 'Every 2 hours repositioning. Pressure redistribution mattress. Enhanced nutrition.' },
    { range: '13–14', level: 'Moderate Risk', color: '#CA8A04', action: 'Regular repositioning. Standard prevention bundle.' },
    { range: '15–18', level: 'Mild Risk', color: '#16A34A', action: 'Standard prevention measures. Monitor closely.' },
    { range: '19–23', level: 'No Significant Risk', color: '#059669', action: 'Routine care. Reassess if condition changes.' },
  ],
};

// ============================================
// WATERLOW SCORE GUIDE
// ============================================
export const WATERLOW_GUIDE = {
  categories: [
    {
      name: 'Build/BMI',
      options: [
        { label: 'Average (BMI 20-24.9)', score: 0 },
        { label: 'Above Average (BMI 25-29.9)', score: 1 },
        { label: 'Obese (BMI ≥ 30)', score: 2 },
        { label: 'Below Average (BMI < 20)', score: 3 },
      ],
    },
    {
      name: 'Skin Type',
      options: [
        { label: 'Healthy', score: 0 },
        { label: 'Tissue Paper/Dry', score: 1 },
        { label: 'Oedematous/Clammy/Discolored/Broken', score: 2 },
      ],
    },
    {
      name: 'Sex',
      options: [
        { label: 'Male', score: 1 },
        { label: 'Female', score: 2 },
      ],
    },
    {
      name: 'Age',
      options: [
        { label: '14-49', score: 1 },
        { label: '50-64', score: 2 },
        { label: '65-74', score: 3 },
        { label: '75-80', score: 4 },
        { label: '81+', score: 5 },
      ],
    },
    {
      name: 'Continence',
      options: [
        { label: 'Complete / Catheterized', score: 0 },
        { label: 'Occasional Incontinence', score: 1 },
        { label: 'Catheterized / Incontinent of Feces', score: 2 },
        { label: 'Doubly Incontinent', score: 3 },
      ],
    },
    {
      name: 'Mobility',
      options: [
        { label: 'Fully Mobile', score: 0 },
        { label: 'Restless/Fidgety', score: 1 },
        { label: 'Apathetic', score: 2 },
        { label: 'Restricted', score: 3 },
        { label: 'Inert / Traction', score: 4 },
        { label: 'Chairbound', score: 5 },
      ],
    },
    {
      name: 'Appetite',
      options: [
        { label: 'Average', score: 0 },
        { label: 'Poor', score: 1 },
        { label: 'NG/IV/Fluids Only', score: 2 },
        { label: 'NBM / Anorexic', score: 3 },
      ],
    },
  ],
  specialRisks: [
    {
      name: 'Tissue Malnutrition',
      options: [
        { label: 'Terminal Cachexia', score: 8 },
        { label: 'Multiple Organ Failure', score: 8 },
        { label: 'Single Organ Failure (respiratory, renal, cardiac)', score: 5 },
        { label: 'Peripheral Vascular Disease', score: 5 },
        { label: 'Anemia (Hb < 8)', score: 2 },
        { label: 'Smoking', score: 1 },
      ],
    },
    {
      name: 'Neurological Deficit',
      options: [
        { label: 'Diabetes / MS / CVA / Motor / Sensory / Paraplegia', score: 6 },
      ],
    },
    {
      name: 'Major Surgery / Trauma',
      options: [
        { label: 'Orthopaedic / Spinal (below waist)', score: 5 },
        { label: 'On Table > 2 Hours', score: 5 },
        { label: 'On Table > 6 Hours', score: 8 },
      ],
    },
    {
      name: 'Medication',
      options: [
        { label: 'Cytotoxics / High-dose Steroids / Anti-inflammatories', score: 4 },
      ],
    },
  ],
  interpretation: [
    { range: '< 10', level: 'Not at Risk', color: '#059669' },
    { range: '10–14', level: 'At Risk', color: '#CA8A04' },
    { range: '15–19', level: 'High Risk', color: '#EA580C' },
    { range: '≥ 20', level: 'Very High Risk', color: '#DC2626' },
  ],
};

// ============================================
// PUSH TOOL 3.0 SCORING GUIDE
// ============================================
export const PUSH_TOOL_GUIDE = {
  lengthTimesWidth: [
    { score: 0, range: '0 cm²' },
    { score: 1, range: '< 0.3 cm²' },
    { score: 2, range: '0.3 – 0.6 cm²' },
    { score: 3, range: '0.7 – 1.0 cm²' },
    { score: 4, range: '1.1 – 2.0 cm²' },
    { score: 5, range: '2.1 – 3.0 cm²' },
    { score: 6, range: '3.1 – 4.0 cm²' },
    { score: 7, range: '4.1 – 8.0 cm²' },
    { score: 8, range: '8.1 – 12.0 cm²' },
    { score: 9, range: '12.1 – 24.0 cm²' },
    { score: 10, range: '> 24.0 cm²' },
  ],
  exudateAmount: [
    { score: 0, label: 'None' },
    { score: 1, label: 'Light' },
    { score: 2, label: 'Moderate' },
    { score: 3, label: 'Heavy' },
  ],
  surfaceType: [
    { score: 0, label: 'Closed' },
    { score: 1, label: 'Epithelial Tissue' },
    { score: 2, label: 'Granulation Tissue' },
    { score: 3, label: 'Slough' },
    { score: 4, label: 'Necrotic Tissue' },
  ],
};

// ============================================
// WOUND BED PREPARATION - TIME FRAMEWORK
// ============================================
export const TIME_FRAMEWORK = {
  T: {
    name: 'Tissue (non-viable or deficient)',
    assessment: ['Identify type of tissue in wound bed', 'Percentage of viable vs non-viable tissue', 'Color assessment (red, yellow, black, mixed)'],
    interventions: [
      'Surgical debridement (sharp) for necrotic tissue',
      'Autolytic debridement: hydrogels, hydrocolloids',
      'Enzymatic debridement: collagenase',
      'Mechanical debridement: wet-to-dry (less preferred)',
      'Biological: larval therapy',
    ],
    goal: 'Viable wound bed free of non-viable tissue',
  },
  I: {
    name: 'Infection / Inflammation',
    assessment: ['Signs of infection (NERDS/STONEES mnemonics)', 'Biofilm suspected?', 'Critical colonization vs clinical infection', 'Systemic infection signs'],
    interventions: [
      'Topical antimicrobials: silver, PHMB, cadexomer iodine',
      'Wound cleansing with appropriate agents',
      'Systemic antibiotics if clinical infection present',
      'Biofilm disruption: mechanical + antimicrobial',
      'Specimen for culture: tissue biopsy > swab',
    ],
    goal: 'Bacterial balance and controlled inflammation',
  },
  M: {
    name: 'Moisture (imbalance)',
    assessment: ['Exudate amount and type', 'Peri-wound skin maceration', 'Wound too dry or too moist?'],
    interventions: [
      'Too wet: absorbent dressings (alginates, foams, superabsorbent)',
      'Too dry: hydrogel, honey-based dressings',
      'Peri-wound protection: barrier films, zinc oxide',
      'NPWT for managing excess exudate',
    ],
    goal: 'Optimal moisture balance for healing',
  },
  E: {
    name: 'Edge (non-advancing or undermined)',
    assessment: ['Edge advancing or non-advancing?', 'Undermining or tunneling present?', 'Rolled or calloused edges', 'Epithelial migration assessment'],
    interventions: [
      'Debridement of rolled/calloused edges',
      'Address underlying causes of non-advancing edge',
      'Skin grafting or flap consideration',
      'Growth factors (if available)',
      'NPWT to promote edge advancement',
    ],
    goal: 'Advancing wound edge with epithelial migration',
  },
};

// ============================================
// DRESSING SELECTION GUIDE
// ============================================
export const DRESSING_SELECTION = [
  {
    woundType: 'Dry / Low Exudate',
    stage: ['Stage 1', 'Stage 2'],
    primary: 'Hydrocolloid (e.g., DuoDERM) or Transparent Film (e.g., Tegaderm)',
    secondary: 'None required',
    changeFrequency: 'Every 3-7 days or when dislodged',
    rationale: 'Maintains moisture, protects from friction, autolytic debridement',
  },
  {
    woundType: 'Moderate Exudate / Granulating',
    stage: ['Stage 2', 'Stage 3'],
    primary: 'Foam dressing (e.g., Mepilex, Allevyn)',
    secondary: 'Transparent film if needed for securing',
    changeFrequency: 'Every 2-3 days or when saturated',
    rationale: 'Absorbs exudate while maintaining moisture balance',
  },
  {
    woundType: 'Heavy Exudate',
    stage: ['Stage 3', 'Stage 4'],
    primary: 'Alginate (e.g., Kaltostat) or Hydrofiber (e.g., Aquacel)',
    secondary: 'Foam or gauze secondary dressing',
    changeFrequency: 'Daily or when saturated',
    rationale: 'High absorbency, gels on contact with exudate, hemostatic properties',
  },
  {
    woundType: 'Slough / Necrotic',
    stage: ['Stage 3', 'Stage 4', 'Unstageable'],
    primary: 'Hydrogel (e.g., Intrasite Gel) for autolytic debridement',
    secondary: 'Film or gauze cover',
    changeFrequency: 'Daily to every 2 days',
    rationale: 'Rehydrates necrotic tissue for autolytic debridement; alternative: sharp debridement',
  },
  {
    woundType: 'Infected / Critically Colonized',
    stage: ['Any stage with infection signs'],
    primary: 'Silver-containing dressing (e.g., Acticoat, Aquacel Ag) or Cadexomer Iodine',
    secondary: 'As appropriate for exudate level',
    changeFrequency: 'Daily or per manufacturer guidance',
    rationale: 'Broad-spectrum antimicrobial action; reassess after 2 weeks',
  },
  {
    woundType: 'Cavity / Undermining',
    stage: ['Stage 3', 'Stage 4'],
    primary: 'Alginate or hydrofiber rope/ribbon',
    secondary: 'Foam or gauze packing (loosely fill, do not pack tightly)',
    changeFrequency: 'Daily to every 2 days',
    rationale: 'Fills dead space, absorbs exudate, prevents premature surface closure',
  },
];

// ============================================
// PRESSURE RELIEF SURFACES GUIDE
// ============================================
export const PRESSURE_RELIEF_SURFACES = [
  { type: 'Standard Hospital Mattress', indication: 'Low risk patients (Braden 19-23)', features: 'Standard foam, not adequate for at-risk patients' },
  { type: 'Static Overlay (Foam/Gel)', indication: 'Mild risk (Braden 15-18)', features: 'Placed on top of standard mattress, redistributes pressure' },
  { type: 'Alternating Pressure Mattress', indication: 'Moderate to High risk (Braden 10-14)', features: 'Alternating inflation/deflation cycles, active pressure redistribution' },
  { type: 'Low Air Loss Mattress', indication: 'High risk (Braden ≤ 12) with moisture issues', features: 'Continuous airflow manages moisture and temperature' },
  { type: 'Air Fluidized Bed (Clinitron)', indication: 'Very high risk (Braden ≤ 9) / Large Stage 3-4 ulcers / Post-flap surgery', features: 'Maximum pressure redistribution, specialized surface' },
  { type: 'Specialist Foam Mattress', indication: 'Moderate risk (Braden 13-14)', features: 'Multi-density foam, pressure redistribution without power' },
  { type: 'Wheelchair Cushion (Foam/Air/Gel)', indication: 'All wheelchair-bound patients', features: 'Essential for seated pressure redistribution' },
];

// ============================================
// NUTRITION PROTOCOL FOR PRESSURE SORES
// ============================================
export const NUTRITION_PROTOCOL = {
  caloricTargets: {
    healing: '30-35 kcal/kg/day',
    maintenance: '25-30 kcal/kg/day',
    obese: '22-25 kcal/kg adjusted body weight',
  },
  proteinTargets: {
    healing: '1.25-1.5 g/kg/day',
    severe: '1.5-2.0 g/kg/day (Stage 3-4)',
    normal: '0.8-1.0 g/kg/day',
  },
  micronutrients: [
    { nutrient: 'Vitamin C', dose: '500mg twice daily', role: 'Collagen synthesis, immune function' },
    { nutrient: 'Zinc', dose: '220mg (elemental 50mg) daily for 10 days then reassess', role: 'Cell proliferation, collagen synthesis, immune function' },
    { nutrient: 'Vitamin A', dose: '10,000 IU daily for 10 days if on steroids', role: 'Counteracts steroid effect on wound healing' },
    { nutrient: 'Iron', dose: 'As indicated by anemia workup', role: 'Oxygen transport, energy metabolism' },
    { nutrient: 'Arginine', dose: '4.5g daily (supplement)', role: 'Nitric oxide production, collagen synthesis' },
  ],
  hydration: '30 mL/kg body weight/day minimum (adjust for cardiac/renal comorbidities)',
  monitoring: [
    'Weekly weight',
    'Serum albumin (goal > 3.5 g/dL) – trend every 2 weeks',
    'Pre-albumin (goal > 15 mg/dL) – more responsive marker, weekly',
    'Dietary intake assessment (food charts)',
    'Calorie count when intake < 75% of meals',
  ],
};

// ============================================
// PREVENTION BUNDLE - SSKIN Framework
// ============================================
export const SSKIN_BUNDLE = [
  {
    letter: 'S',
    name: 'Surface',
    actions: [
      'Assess pressure redistribution needs based on risk score',
      'Provide appropriate support surface',
      'Check surface is functioning correctly each shift',
      'Do not use ring cushions (donut devices)',
      'Heel elevation with pillows or purpose-made devices',
    ],
  },
  {
    letter: 'S',
    name: 'Skin Inspection',
    actions: [
      'Head-to-toe skin inspection on admission and at least daily',
      'Focus on bony prominences and under medical devices',
      'Assess for non-blanchable erythema using glass test',
      'Document findings on body map',
      'Increase frequency if high risk',
    ],
  },
  {
    letter: 'K',
    name: 'Keep Moving',
    actions: [
      'Repositioning schedule based on risk (1-4 hourly)',
      '30° tilt for side-lying (avoid 90° lateral position)',
      'Avoid positioning on existing pressure injuries',
      'Use positioning aids (pillows, wedges, 30° tilt devices)',
      'Encourage mobility and self-repositioning when possible',
      'Micro-movements for chair-bound patients',
    ],
  },
  {
    letter: 'I',
    name: 'Incontinence / Moisture',
    actions: [
      'Implement continence management plan',
      'Use barrier cream for at-risk skin',
      'Change wet/soiled linen promptly',
      'Consider containment devices (condom catheter, absorbent pads)',
      'Structured skin care regimen: cleanse, moisturize, protect',
    ],
  },
  {
    letter: 'N',
    name: 'Nutrition / Hydration',
    actions: [
      'MUST screening on admission',
      'High protein, high calorie diet for at-risk patients',
      'Oral nutritional supplements (ONS) as indicated',
      'Dietitian referral for MUST ≥ 2',
      'Fluid balance monitoring',
      'Supplement vitamins and zinc as per protocol',
    ],
  },
];

// ============================================
// SURGICAL OPTIONS FOR PRESSURE SORES
// ============================================
export const SURGICAL_OPTIONS = [
  {
    procedure: 'Sharp/Surgical Debridement',
    indication: 'Necrotic tissue, biofilm, non-healing wound',
    description: 'Removal of necrotic tissue using scalpel/scissors at bedside or in theatre',
    considerations: 'May need analgesia/sedation. Assess bleeding risk. Check coagulation status.',
  },
  {
    procedure: 'NPWT (Negative Pressure Wound Therapy)',
    indication: 'Stage 3-4 after debridement, granulation promotion, exudate management',
    description: 'Controlled sub-atmospheric pressure applied to wound bed via sealed dressing',
    considerations: 'Typical settings: -75 to -125 mmHg continuous or intermittent. Change Q48-72h.',
  },
  {
    procedure: 'Flap Closure',
    indication: 'Stage 3-4 after adequate wound bed preparation, adequate nutrition, controllable comorbidities',
    description: 'Musculocutaneous or fasciocutaneous flap coverage of pressure sore defect',
    considerations: 'Most common: gluteal flaps (sacral), tensor fascia lata (trochanteric), biceps femoris (ischial). Recurrence rate 30-60%.',
  },
  {
    procedure: 'Skin Grafting',
    indication: 'Large shallow defects with good granulation bed',
    description: 'Split-thickness or full-thickness skin graft',
    considerations: 'Less durable than flaps for pressure-bearing areas. Better for non-weight-bearing locations.',
  },
  {
    procedure: 'Total Contact Casting',
    indication: 'Heel pressure ulcers with underlying diabetic neuropathy',
    description: 'Off-loading cast that redistributes pressure',
    considerations: 'Requires specialist application and monitoring. Not for infected wounds.',
  },
];

// ============================================
// EDUCATION CONTENT
// ============================================
export const PS_EDUCATION_CONTENT: PSEducationContent = {
  patientEducation: {
    overview: 'Pressure sores (also called pressure ulcers or bedsores) develop when constant pressure on the skin reduces blood flow to the area. They commonly occur over bony areas like the tailbone, heels, hips, and elbows. Prevention is the best treatment – most pressure sores are preventable with proper care.',
    preventionStrategies: [
      'Change position frequently – at least every 2 hours in bed',
      'When sitting, shift weight every 15-30 minutes',
      'Use pillows to relieve pressure on bony areas',
      'Keep skin clean and dry',
      'Check your skin daily (use a mirror for areas you cannot see)',
      'Do NOT massage red or damaged areas',
      'Eat a healthy diet with adequate protein',
      'Drink plenty of fluids (unless restricted by your doctor)',
      'Stop smoking – it reduces blood flow and delays healing',
    ],
    skinCareInstructions: [
      'Inspect skin daily, especially over bony prominences',
      'Wash with mild soap and warm water – pat dry, do not rub',
      'Apply moisturizer to dry skin, avoiding open wounds',
      'Use barrier cream if incontinent (zinc oxide or dimethicone-based)',
      'Report any new redness, blisters, or skin changes to your nurse',
      'Do not use alcohol-based products on skin',
      'Keep bed sheets smooth and wrinkle-free',
    ],
    positioningGuidance: [
      'In bed: lie at 30° tilt alternating left and right side',
      'Do NOT lie directly on hip bones (greater trochanter)',
      'Keep heels off the bed using pillow under calves',
      'In a wheelchair: sit upright with cushion; do "pressure lifts" every 15 minutes',
      'Limit time in bed with head of bed elevated > 30° (increases sacral pressure)',
      'Use positioning aids (foam wedges, pillows, specialty cushions)',
    ],
    nutritionAdvice: [
      'Eat foods high in protein: eggs, fish, beans, chicken, dairy',
      'Include fruits and vegetables for vitamins C and A',
      'Eat foods rich in zinc: nuts, seeds, whole grains',
      'Drink at least 8 glasses of fluid daily (unless restricted)',
      'Take nutritional supplements if recommended by your care team',
      'If you have difficulty eating, ask about meal assistance or supplements',
    ],
    equipmentUse: [
      'Use prescribed pressure-relieving mattress/cushion correctly',
      'Do not add extra sheets or blankets on top of pressure-relieving surfaces (reduces effectiveness)',
      'Keep wheelchair cushion properly positioned',
      'Check equipment daily for proper functioning',
      'If equipment makes noise or seems deflated, report immediately',
    ],
    warningSigns: [
      'Any new redness that does not go away when you press on it',
      'Blisters or broken skin over bony areas',
      'Skin feeling warmer or cooler than surrounding areas',
      'Darkened areas on dark-skinned individuals',
      'Increasing pain in a specific area',
      'Foul smell from any wound',
      'Drainage or discharge from the wound',
    ],
    whenToSeekHelp: [
      'New sore or worsening of existing sore',
      'Signs of infection: redness, warmth, swelling, fever',
      'Wound discharge that is thick, green, or foul-smelling',
      'Increasing pain not relieved by repositioning',
      'Wound getting larger despite treatment',
      'General feeling of being unwell with fever',
    ],
    homeCareTips: [
      'Follow the repositioning schedule your team teaches you',
      'Keep wound dressings clean and dry',
      'Change dressings as instructed – wash hands before and after',
      'Use clean linens daily',
      'Keep room well-ventilated',
      'Community nurse should visit as arranged for wound care',
      'Attend all follow-up appointments',
    ],
    caregiverGuidance: [
      'Learn proper repositioning techniques from the nursing team',
      'Use a turning schedule and record when repositioning is done',
      'Learn to inspect skin for early warning signs',
      'Ensure patient consumes adequate food and fluids',
      'Learn proper wound dressing technique before discharge',
      'Know when to call for help: signs of infection, worsening wound',
      'Take care of your own health – ask for help when needed',
      'Attend carer training sessions if available',
    ],
  },
  nursingEducation: {
    riskAssessmentProtocol: [
      'Braden Scale assessment on admission and every 48–72 hours (or with change in condition)',
      'Waterlow assessment on admission (alternative to Braden)',
      'Reassess risk with ANY change in mobility, continence, or nutrition',
      'Document risk score and intervention plan',
      'High-risk patients: Braden ≤ 14 or Waterlow ≥ 15',
      'Communicate risk status at handover',
      'Initiate prevention bundle for all at-risk patients',
    ],
    skinAssessmentTechnique: [
      'Inspect ALL bony prominences at least daily',
      'Use "blanch test": press finger on reddened area for 3 seconds – if redness remains when released, Stage 1 PI present',
      'In dark skin: look for persistent purple/maroon discoloration, localized heat, edema, induration',
      'Check under and around medical devices (O₂ masks, catheters, splints)',
      'Document using validated tool: location, size (L×W×D), wound bed, peri-wound, exudate',
      'Photograph wound with ruler for measurement and date stamp',
    ],
    repositioningProtocol: [
      'Very high risk (Braden ≤ 9): Reposition Q1h',
      'High risk (Braden 10-12): Reposition Q2h',
      'Moderate risk (Braden 13-14): Reposition Q2-4h',
      'Use 30° lateral tilt (NOT 90°)',
      'Avoid positioning on existing pressure injuries',
      'Support limbs with pillows to prevent contact pressure',
      'Elevate heels off bed surface (pillow under calves)',
      'Seated patients: weight shifts every 15-30 minutes; limit sitting to 2 hours continuous',
      'Document repositioning schedule and compliance',
    ],
    woundCareProtocol: [
      'Cleanse wound with normal saline or prescribed cleanser at each dressing change',
      'Select dressing based on wound bed, exudate level, and wound stage (see dressing selection guide)',
      'Measure wound at least weekly: L × W × D, undermining, tunneling',
      'Complete PUSH score at each measurement to track healing trend',
      'Apply TIME framework for wound bed assessment',
      'Protect peri-wound skin with barrier product',
      'Do NOT use cytotoxic agents in wound bed (hydrogen peroxide, povidone-iodine in full concentration)',
      'For stable heel eschar: do NOT debride – protect and monitor',
    ],
    dressingSelection: [
      'Stage 1: Transparent film or thin hydrocolloid for protection',
      'Stage 2 (shallow, minimal exudate): Hydrocolloid, foam',
      'Stage 3 (moderate exudate): Foam, alginate, hydrofiber',
      'Stage 4 (heavy exudate, cavity): Alginate rope, NPWT',
      'Infected: Silver-containing or cadexomer iodine dressings',
      'Necrotic/slough: Hydrogel for autolytic debridement, or surgical debridement',
      'Always match dressing to wound need – reassess at each change',
    ],
    documentationRequirements: [
      'Risk assessment score and date',
      'Skin assessment findings on body map',
      'Wound measurements (L×W×D) in centimeters',
      'Wound bed description (% granulation, slough, necrosis)',
      'Peri-wound skin condition',
      'Exudate type and amount',
      'Dressing type and change frequency',
      'PUSH score and healing trend',
      'Repositioning schedule and compliance',
      'Nutritional status and intake tracking',
      'Pain assessment related to wound',
      'Photos with date/time stamp',
      'Patient/family education provided',
    ],
    pressureReliefDevices: [
      'Assess and provide appropriate support surface WITHIN 4 hours of risk identification',
      'Do NOT use ring cushions/donut devices',
      'Check air mattress functioning each shift',
      'Ensure alternating pressure mattress is not bottoming out',
      'Wheelchair: provide appropriate pressure-redistributing cushion',
      'Heel elevation devices: ensure no pressure on Achilles tendon',
      'Monitor medical devices for pressure damage (O₂ masks, tubes, catheters)',
    ],
    nutritionMonitoring: [
      'MUST screening on admission and weekly',
      'Refer to dietitian if MUST ≥ 2 or existing Stage 2+ pressure ulcer',
      'Target: 30-35 kcal/kg/day for healing; Protein: 1.25-1.5 g/kg/day',
      'Oral nutritional supplements prescribed: ensure patient takes them',
      'Monitor albumin/pre-albumin trends',
      'Food chart documentation – meal intake %',
      'Weekly weight',
      'Vitamin and mineral supplements as per protocol',
    ],
    patientFamilyTeaching: [
      'Explain pressure sore prevention using simple language',
      'Demonstrate repositioning techniques',
      'Teach skin inspection including use of mirror',
      'Explain importance of nutrition and hydration',
      'Provide written information leaflet',
      'Identify carer/family member for home care training',
      'Demonstrate wound care technique if being discharged with wound',
      'Document education provided and learner understanding',
    ],
    qualityIndicators: [
      'Prevalence: hospital-acquired pressure ulcer rate (target < 5%)',
      'Risk assessment completion rate within 6 hours of admission (target > 95%)',
      'Prevention bundle compliance rate (target > 90%)',
      'Repositioning adherence rate',
      'Healing rate: PUSH score reduction over time',
      'Time from identification to prevention bundle initiation',
      'Device-related pressure injury rate',
      'Documentation compliance rate',
    ],
  },
  cmeContent: {
    title: 'Evidence-Based Pressure Sore Prevention and Management: A WHO/NPUAP/EPUAP-Adapted Clinical Update for the African Surgical Context',
    objectives: [
      'Classify pressure ulcers using the NPUAP/EPUAP international staging system',
      'Apply the Braden and Waterlow risk assessment tools correctly',
      'Implement evidence-based prevention strategies using the SSKIN bundle',
      'Select appropriate wound management strategies based on stage and wound bed assessment',
      'Apply the TIME framework for wound bed preparation',
      'Manage comorbidities that impair pressure sore healing',
      'Determine surgical options and timing for advanced pressure ulcers',
      'Implement nutritional protocols to optimize wound healing',
    ],
    clinicalPearls: [
      'Pressure ulcers are PREVENTABLE in 95% of cases – prevention is always cheaper than treatment',
      'In dark-skinned patients, Stage 1 may appear as purple/maroon discoloration rather than redness – always palpate for heat and induration',
      'A 30° lateral tilt position reduces interface pressure by 40-60% compared to 90° side-lying',
      'Stable eschar on heels should NOT be debrided – it serves as the body\'s biological dressing',
      'Every 1 g/dL increase in serum albumin correlates with improved wound healing',
      'Repositioning every 2 hours on a specialty mattress is equivalent to repositioning every 4 hours on a standard mattress',
      'Ring cushions (donut devices) are HARMFUL – they concentrate pressure at the periphery',
      'Negative pressure wound therapy can increase granulation tissue formation by 63% in pressure ulcers',
      'Smoking reduces skin blood flow by 40-50% and significantly delays wound healing',
      'Surgical flap failure rate is 30-60% if underlying cause not addressed (immobility, nutrition, continence)',
    ],
    evidenceBasedGuidelines: [
      'NPUAP/EPUAP/PPPIA International Pressure Ulcer Guidelines (2019 Edition)',
      'WHO Guidelines on Prevention and Management of Pressure Ulcers/Injuries',
      'NICE Guidelines CG179: Pressure Ulcers: Prevention and Management (2014, updated 2024)',
      'European Wound Management Association (EWMA) Position Documents',
      'Wounds UK Best Practice Statements',
      'Cochrane Systematic Reviews on pressure ulcer interventions',
    ],
    classificationSystems: [
      'NPUAP/EPUAP International Classification System (6 categories)',
      'Braden Scale for Predicting Pressure Sore Risk (6 subscales, score 6-23)',
      'Waterlow Score (more UK-focused, score 0-60+)',
      'Norton Scale (5 parameters, score 5-20)',
      'PUSH Tool 3.0 (Pressure Ulcer Scale for Healing – 3 parameters, score 0-17)',
      'TIME Framework (Tissue, Infection, Moisture, Edge – wound bed preparation)',
    ],
    treatmentAlgorithm: [
      'Stage 1: Pressure relief + skin protection + repositioning + nutrition optimization',
      'Stage 2: Moist wound healing dressings + pressure relief + nutritional support + monitor for deterioration',
      'Stage 3: Wound bed preparation (TIME framework) + appropriate dressing + consider NPWT + nutrition + surgical consult',
      'Stage 4: Surgical debridement + NPWT + optimize nutrition + manage comorbidities + consider flap closure when ready',
      'Unstageable: Debride to determine depth (except stable heel eschar) + then treat per revealed stage',
      'DTPI: Aggressive pressure relief + monitor evolution + serial photography + avoid additional pressure',
      'ALL STAGES: Risk assessment, prevention bundle (SSKIN), nutrition, patient education, documentation',
    ],
    surgicalOptions: [
      'Stage 3-4 sacral: Gluteal rotation flap (superior or inferior gluteal artery perforator)',
      'Ischial: Hamstring advancement flap, posterior thigh flap, or gracilis musculocutaneous flap',
      'Trochanteric: Tensor fascia lata flap, vastus lateralis flap',
      'Heel: Reverse sural flap, medial plantar flap (complex; consider conservative management first)',
      'Pre-requisites for surgery: clean wound bed, adequate nutrition (albumin > 3.0), controlled infections, optimized comorbidities',
      'Post-operative care: specialized surface, avoid pressure on flap for 2-4 weeks, graduated sitting protocol',
    ],
    preventionStrategies: [
      'Risk assessment within 6 hours of admission',
      'SSKIN bundle implementation for all at-risk patients',
      'Appropriate pressure-redistributing support surfaces',
      'Structured repositioning schedules with documentation',
      'Nutritional screening and supplementation',
      'Continence management',
      'Skin care and moisture management',
      'Medical device-related pressure injury prevention',
      'Patient and carer education',
      'Quality improvement monitoring with prevalence surveys',
    ],
    qualityImprovement: [
      'Monthly hospital-acquired pressure injury (HAPI) prevalence audits',
      'Risk assessment compliance audits (target > 95% within 6 hours)',
      'Bundle compliance audits',
      'Root cause analysis for all Stage 3 and 4 HAPIs',
      'Staff education and competency assessment',
      'Skin champion program (dedicated ward skin champions)',
      'Patient feedback on preventive care',
      'Benchmarking against national and international prevalence data',
    ],
    references: [
      'European Pressure Ulcer Advisory Panel, National Pressure Injury Advisory Panel, Pan Pacific Pressure Injury Alliance. Prevention and Treatment of Pressure Ulcers/Injuries: Clinical Practice Guideline. 3rd Edition. 2019.',
      'National Institute for Health and Care Excellence (NICE). Pressure ulcers: prevention and management. Clinical guideline CG179. 2014 (updated 2024).',
      'Braden BJ, Bergstrom N. Clinical utility of the Braden Scale for Predicting Pressure Sore Risk. Decubitus. 1989;2(3):44-51.',
      'Waterlow J. Pressure sores: a risk assessment card. Nurs Times. 1985;81(48):49-55.',
      'Stotts NA, et al. An instrument to measure healing in pressure ulcers: development and validation of the Pressure Ulcer Scale for Healing (PUSH). J Gerontol A Biol Sci Med Sci. 2001;56(12):M795-9.',
      'Schultz GS, et al. Wound bed preparation: a systematic approach to wound management. Wound Repair Regen. 2003;11 Suppl 1:S1-28. (TIME framework)',
      'Bauer JD, et al. Nutritional support in pressure injury management. Adv Skin Wound Care. 2021;34(3):1-8.',
      'WHO. Global report on health equity for persons with disabilities. 2023. (Pressure injury prevention section)',
    ],
    caseStudies: [
      {
        title: 'Case 1: Sacral Pressure Ulcer Stage 4 in Spinal Cord Injury Patient',
        presentation: '28-year-old male, paraplegic (T10 complete) following road traffic accident 2 years ago. Presents with a 15×12×4 cm sacral pressure ulcer with exposed sacrum. BMI 17.5, albumin 2.1 g/dL. Lives with elderly mother in rural area. Currently in self-made wheelchair without cushion.',
        assessment: 'Braden Score: 11 (High Risk). PUSH Score: 16. Wound bed: 40% granulation, 30% slough, 30% necrotic tissue. Undermining 3cm at 9 o\'clock position. Moderate serosanguinous exudate. No osteomyelitis on MRI.',
        management: 'Phase 1 (Weeks 1-2): Surgical debridement, NPWT, nutritional build-up (high protein diet + ONS + vitamins C, zinc), pressure-relieving mattress. Phase 2 (Weeks 3-6): Continued NPWT, wound bed optimization, pre-albumin target > 15. Phase 3 (Week 6+): Gluteal rotation flap closure when criteria met. Post-op: Specialty air surface, no sitting for 4 weeks, graduated mobility.',
        outcome: 'Flap successful at 7 weeks. Discharged at 10 weeks with pressure-relieving wheelchair cushion, community nursing follow-up, and dietary plan. Healed at 4-month follow-up.',
        learningPoints: [
          'Nutritional optimization is essential BEFORE surgical reconstruction',
          'Albumin > 3.0 g/dL before flap surgery reduces failure rate',
          'Long-term prevention plan essential to prevent recurrence (60% recurrence in SCI)',
          'Wheelchair cushion prescription is as important as mattress',
          'Community follow-up and carer education critical for sustained healing',
        ],
      },
      {
        title: 'Case 2: Hospital-Acquired Pressure Injury in Post-Op Elderly Patient',
        presentation: '74-year-old woman, Day 3 post-hip replacement. Found to have Stage 2 pressure ulcer over left heel and Stage 1 over sacrum during morning skin check. She is confused (Day 1 post-op delirium), incontinent of urine (catheter removed Day 1), and eating less than 25% of meals. Current: standard hospital mattress.',
        assessment: 'Braden Score: 13 (Moderate Risk). Heel ulcer: 2×1.5 cm partial-thickness, clean wound bed. Sacral area: non-blanchable erythema 5×4 cm.',
        management: 'Immediate: Alternating pressure mattress, heel elevation with suspension device, incontinence management (re-catheterize temporarily), hydrocolloid on heel wound, transparent film on sacrum. Nutrition: dietitian referral, high-protein ONS twice daily. Mobility: early mobilization with physiotherapy. Education: family and ward staff briefed.',
        outcome: 'Sacral Stage 1 resolved within 72 hours. Heel Stage 2 healed at 2 weeks. Root cause analysis performed. Ward education session conducted.',
        learningPoints: [
          'Hospital-acquired pressure injuries are a quality and safety indicator',
          'Risk assessment must be repeated with ANY change in condition',
          'Standard hospital mattresses are inadequate for at-risk patients',
          'Heels are the second most common site – always elevate',
          'Early mobilization is protective – engage physiotherapy early',
          'Root cause analysis drives system improvement',
        ],
      },
    ],
  },
};

// ============================================
// EXPORT ALL PROTOCOL DATA
// ============================================
export const PS_PROTOCOL = {
  stages: PRESSURE_ULCER_STAGES,
  bradenScale: BRADEN_SCALE_GUIDE,
  waterlowGuide: WATERLOW_GUIDE,
  pushTool: PUSH_TOOL_GUIDE,
  timeFramework: TIME_FRAMEWORK,
  dressingSelection: DRESSING_SELECTION,
  pressureReliefSurfaces: PRESSURE_RELIEF_SURFACES,
  nutritionProtocol: NUTRITION_PROTOCOL,
  sskinBundle: SSKIN_BUNDLE,
  surgicalOptions: SURGICAL_OPTIONS,
  education: PS_EDUCATION_CONTENT,
};
