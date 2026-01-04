// Burns Calculator
// TBSA, Parkland Formula, ABSI Score, and WHO-Adapted Burns Management

import { useState } from 'react';
import { Flame, Calculator, AlertTriangle, Droplets, Activity } from 'lucide-react';
import { PatientCalculatorInfo, BurnsResult } from '../../types';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

// Body part percentages for Rule of Nines
const ADULT_RULE_OF_NINES = {
  head: { name: 'Head & Neck', percentage: 9 },
  chestAbdomen: { name: 'Anterior Trunk (Chest & Abdomen)', percentage: 18 },
  back: { name: 'Posterior Trunk (Back)', percentage: 18 },
  rightArm: { name: 'Right Arm', percentage: 9 },
  leftArm: { name: 'Left Arm', percentage: 9 },
  genitalia: { name: 'Genitalia/Perineum', percentage: 1 },
  rightLeg: { name: 'Right Leg', percentage: 18 },
  leftLeg: { name: 'Left Leg', percentage: 18 },
};

const CHILD_RULE_OF_NINES = {
  head: { name: 'Head & Neck', percentage: 18 },
  chestAbdomen: { name: 'Anterior Trunk', percentage: 18 },
  back: { name: 'Posterior Trunk', percentage: 18 },
  rightArm: { name: 'Right Arm', percentage: 9 },
  leftArm: { name: 'Left Arm', percentage: 9 },
  genitalia: { name: 'Genitalia/Perineum', percentage: 1 },
  rightLeg: { name: 'Right Leg', percentage: 13.5 },
  leftLeg: { name: 'Left Leg', percentage: 13.5 },
};

export default function BurnsCalculator({ patientInfo }: Props) {
  const [weight, setWeight] = useState(patientInfo.weight || '');
  const [age, setAge] = useState(patientInfo.age || '');
  const [isChild, setIsChild] = useState(false);
  const [timeSinceBurn, setTimeSinceBurn] = useState('');
  
  // Body part burn percentages
  const [bodyParts, setBodyParts] = useState({
    head: 0,
    chestAbdomen: 0,
    back: 0,
    rightArm: 0,
    leftArm: 0,
    genitalia: 0,
    rightLeg: 0,
    leftLeg: 0,
  });
  
  // Burn depth
  const [burnDepth, setBurnDepth] = useState<'superficial' | 'partial' | 'full'>('partial');
  
  // ABSI factors
  const [inhalationInjury, setInhalationInjury] = useState(false);
  const [gender, setGender] = useState<'male' | 'female'>((patientInfo.gender || 'male') as 'male' | 'female');
  
  const [result, setResult] = useState<BurnsResult | null>(null);

  const ruleOfNines = isChild ? CHILD_RULE_OF_NINES : ADULT_RULE_OF_NINES;

  const handleBodyPartChange = (part: keyof typeof bodyParts, value: number) => {
    const maxPercentage = ruleOfNines[part].percentage;
    setBodyParts(prev => ({
      ...prev,
      [part]: Math.min(value, maxPercentage),
    }));
  };

  const calculateTBSA = () => {
    return Object.values(bodyParts).reduce((sum, val) => sum + val, 0);
  };

  const calculateParkland = (tbsa: number, weightKg: number) => {
    // Parkland Formula: 4mL × weight (kg) × %TBSA
    const totalFluid = 4 * weightKg * tbsa;
    const first8Hours = totalFluid / 2;
    const next16Hours = totalFluid / 2;
    const hourlyFirst8 = first8Hours / 8;
    const hourlyNext16 = next16Hours / 16;
    
    return {
      totalFluid24h: Math.round(totalFluid),
      first8Hours: Math.round(first8Hours),
      next16Hours: Math.round(next16Hours),
      hourlyFirst8: Math.round(hourlyFirst8),
      hourlyNext16: Math.round(hourlyNext16),
    };
  };

  const calculateABSI = (tbsa: number, ageValue: number) => {
    let score = 0;
    
    // Age points
    if (ageValue <= 1) score += 1;
    else if (ageValue <= 4) score += 2;
    else if (ageValue <= 19) score += 3;
    else if (ageValue <= 34) score += 4;
    else if (ageValue <= 49) score += 5;
    else if (ageValue <= 64) score += 6;
    else if (ageValue <= 79) score += 7;
    else score += 8;
    
    // Gender
    if (gender === 'female') score += 0;
    else score += 1;
    
    // TBSA points
    if (tbsa <= 1) score += 1;
    else if (tbsa <= 10) score += 2;
    else if (tbsa <= 20) score += 3;
    else if (tbsa <= 30) score += 4;
    else if (tbsa <= 40) score += 5;
    else if (tbsa <= 50) score += 6;
    else if (tbsa <= 60) score += 7;
    else if (tbsa <= 70) score += 8;
    else if (tbsa <= 80) score += 9;
    else if (tbsa <= 90) score += 10;
    else score += 11;
    
    // Full thickness burn
    if (burnDepth === 'full') score += 1;
    
    // Inhalation injury
    if (inhalationInjury) score += 1;
    
    // Survival probability
    let survivalProbability: string;
    let prognosis: string;
    if (score <= 2) {
      survivalProbability = '>99%';
      prognosis = 'Excellent';
    } else if (score <= 3) {
      survivalProbability = '98%';
      prognosis = 'Very Good';
    } else if (score <= 4) {
      survivalProbability = '80-90%';
      prognosis = 'Good';
    } else if (score <= 5) {
      survivalProbability = '50-70%';
      prognosis = 'Moderate';
    } else if (score <= 6) {
      survivalProbability = '20-40%';
      prognosis = 'Guarded';
    } else if (score <= 7) {
      survivalProbability = '10%';
      prognosis = 'Poor';
    } else {
      survivalProbability = '<1%';
      prognosis = 'Very Poor';
    }
    
    return { score, survivalProbability, prognosis };
  };

  const calculate = () => {
    const tbsa = calculateTBSA();
    const weightKg = parseFloat(weight);
    const ageValue = parseInt(age);
    const timeSince = parseFloat(timeSinceBurn) || 0;
    
    const parkland = calculateParkland(tbsa, weightKg);
    const absi = calculateABSI(tbsa, ageValue);
    
    // Severity classification
    let severity: 'Minor' | 'Moderate' | 'Major' | 'Critical';
    if (tbsa < 10 && burnDepth !== 'full' && !inhalationInjury) {
      severity = 'Minor';
    } else if (tbsa < 20 && burnDepth !== 'full') {
      severity = 'Moderate';
    } else if (tbsa < 40) {
      severity = 'Major';
    } else {
      severity = 'Critical';
    }
    
    // Referral criteria
    const referralCriteria: string[] = [];
    if (tbsa >= 10) referralCriteria.push('TBSA ≥10%');
    if (burnDepth === 'full') referralCriteria.push('Full-thickness burns present');
    if (inhalationInjury) referralCriteria.push('Inhalation injury suspected');
    if (bodyParts.genitalia > 0) referralCriteria.push('Perineal/genital burns');
    if (ageValue < 5 || ageValue > 55) referralCriteria.push('Age extremes (<5 or >55 years)');
    
    // Adjusted fluid for delay
    let adjustedFirst8 = parkland.first8Hours;
    let adjustmentNote = '';
    if (timeSince > 0 && timeSince < 8) {
      const remainingTime = 8 - timeSince;
      const alreadyGiven = parkland.hourlyFirst8 * timeSince;
      adjustedFirst8 = parkland.first8Hours - alreadyGiven;
      adjustmentNote = `Time since burn: ${timeSince}h. Give ${Math.round(adjustedFirst8)}mL over remaining ${remainingTime}h (${Math.round(adjustedFirst8 / remainingTime)}mL/h)`;
    }
    
    // Pain management
    const painManagement = burnDepth === 'superficial' 
      ? ['Paracetamol 1g PO q6h', 'Ibuprofen 400mg PO q8h if no contraindications']
      : ['IV Morphine 0.1mg/kg titrated to pain control', 'OR Tramadol 50-100mg IV/IM q6h', 'Consider Ketamine 0.5-1mg/kg IV for dressing changes'];
    
    // Nutrition
    const caloricNeeds = Math.round(25 * weightKg + 40 * tbsa);
    const proteinNeeds = Math.round(1.5 * weightKg + 3 * tbsa);
    
    // Wound care
    const woundCare = burnDepth === 'superficial' 
      ? ['Clean with normal saline', 'Apply Silver sulfadiazine 1% cream', 'Cover with non-adherent dressing', 'Change dressing daily']
      : burnDepth === 'partial'
        ? ['Debride loose skin', 'Clean with chlorhexidine 0.5%', 'Apply Silver sulfadiazine 1% or MEBO', 'Apply petrolatum gauze + absorbent layer', 'Change dressing every 2-3 days', 'Consider honey-based dressings if available']
        : ['Early surgical referral required', 'Escharotomy if circumferential', 'Tangential excision and grafting needed', 'Temporary coverage with biological dressings'];
    
    // Monitoring parameters
    const monitoring = [
      'Urine output: Target 0.5-1mL/kg/h (adults), 1-2mL/kg/h (children)',
      'Vital signs: HR, BP, RR, SpO2, Temperature q1h initially',
      'Daily weights and fluid balance',
      'Hb, WBC, electrolytes, creatinine every 12-24h',
      'Blood glucose monitoring in major burns',
      `Target urine output: ${Math.round(0.5 * weightKg)}-${Math.round(weightKg)}mL/h`,
    ];
    
    // Tetanus
    const tetanus = tbsa > 5 || burnDepth !== 'superficial' 
      ? 'Tetanus toxoid 0.5mL IM if not vaccinated in past 5 years. Give TIG 250-500 units if unknown vaccination status.'
      : 'Update tetanus vaccination if >5 years since last dose';
    
    // Antibiotics
    const antibiotics = tbsa > 30 || burnDepth === 'full'
      ? 'Consider prophylactic antibiotics: Amoxicillin-clavulanate OR Ceftriaxone if signs of sepsis'
      : 'Prophylactic antibiotics not routinely recommended. Monitor for infection signs.';
    
    const calculationResult: BurnsResult = {
      tbsa,
      severity,
      parklandFluid: parkland,
      absiScore: absi.score,
      absiSurvival: absi.survivalProbability,
      absiPrognosis: absi.prognosis,
      referralCriteria,
      fluidAdjustment: adjustmentNote,
      painManagement,
      woundCare,
      monitoring,
      tetanusRecommendation: tetanus,
      antibioticGuidance: antibiotics,
      nutritionNeeds: {
        calories: caloricNeeds,
        protein: proteinNeeds,
      },
      burnDepth,
      inhalationInjury,
    };
    
    setResult(calculationResult);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Flame className="w-5 h-5 sm:w-7 sm:h-7 text-orange-600" />
        <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Burns Assessment Calculator</h2>
      </div>

      <div className="bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 mb-4 sm:mb-6 rounded-r-lg">
        <div className="flex items-start gap-2 sm:gap-3">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs sm:text-sm text-gray-700">
            <p className="font-semibold mb-1">Critical Burns - Emergency Management</p>
            <p>This calculator provides TBSA estimation (Rule of Nines), Parkland fluid resuscitation, and ABSI prognostication. Always prioritize airway management in major burns.</p>
          </div>
        </div>
      </div>

      {/* Patient Parameters */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Weight (kg) *
          </label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 70"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Age (years) *
          </label>
          <input
            type="number"
            value={age}
            onChange={(e) => {
              setAge(e.target.value);
              setIsChild(parseInt(e.target.value) < 10);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 35"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Time Since Burn (hours)
          </label>
          <input
            type="number"
            step="0.5"
            value={timeSinceBurn}
            onChange={(e) => setTimeSinceBurn(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Gender
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as 'male' | 'female')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>

      {/* Body Map for TBSA */}
      <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
        <h3 className="font-bold text-gray-800 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
          <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
          Body Surface Area - Rule of Nines {isChild ? '(Pediatric)' : '(Adult)'}
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
          Enter the percentage of each body area affected by burns.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Object.entries(ruleOfNines).map(([key, { name, percentage }]) => (
            <div key={key}>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                {name} ({percentage}%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max={percentage}
                  step="0.5"
                  value={bodyParts[key as keyof typeof bodyParts]}
                  onChange={(e) => handleBodyPartChange(key as keyof typeof bodyParts, parseFloat(e.target.value))}
                  className="flex-1 accent-orange-600"
                />
                <span className="text-xs sm:text-sm font-semibold w-10 sm:w-12 text-right">
                  {bodyParts[key as keyof typeof bodyParts]}%
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-orange-100 rounded-lg">
          <p className="text-base sm:text-lg font-bold text-orange-800">
            Total TBSA: {calculateTBSA().toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Burn Characteristics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <h4 className="font-semibold text-gray-800 mb-2 sm:mb-3 text-sm sm:text-base">Burn Depth</h4>
          <div className="space-y-1 sm:space-y-2">
            <label className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 hover:bg-gray-100 rounded cursor-pointer">
              <input
                type="radio"
                name="burnDepth"
                checked={burnDepth === 'superficial'}
                onChange={() => setBurnDepth('superficial')}
                className="w-4 h-4 text-orange-600"
              />
              <div>
                <p className="font-medium">Superficial (1st degree)</p>
                <p className="text-xs text-gray-500">Epidermis only, erythema, painful</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer">
              <input
                type="radio"
                name="burnDepth"
                checked={burnDepth === 'partial'}
                onChange={() => setBurnDepth('partial')}
                className="w-4 h-4 text-orange-600"
              />
              <div>
                <p className="font-medium">Partial Thickness (2nd degree)</p>
                <p className="text-xs text-gray-500">Into dermis, blisters, very painful</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer">
              <input
                type="radio"
                name="burnDepth"
                checked={burnDepth === 'full'}
                onChange={() => setBurnDepth('full')}
                className="w-4 h-4 text-orange-600"
              />
              <div>
                <p className="font-medium">Full Thickness (3rd degree)</p>
                <p className="text-xs text-gray-500">Through dermis, leathery/waxy, painless</p>
              </div>
            </label>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-3">Additional Factors</h4>
          <label className="flex items-center gap-3 p-3 bg-red-50 rounded-lg cursor-pointer border-2 border-red-200">
            <input
              type="checkbox"
              checked={inhalationInjury}
              onChange={(e) => setInhalationInjury(e.target.checked)}
              className="w-5 h-5 text-red-600 rounded"
            />
            <div>
              <p className="font-semibold text-red-800">Inhalation Injury Suspected</p>
              <p className="text-xs text-red-700">Singed nasal hairs, soot in mouth, hoarse voice, stridor</p>
            </div>
          </label>
          
          {inhalationInjury && (
            <div className="mt-3 p-3 bg-red-100 rounded-lg">
              <p className="text-sm text-red-800 font-semibold">⚠️ CRITICAL WARNING:</p>
              <ul className="text-sm text-red-700 list-disc ml-4 mt-1">
                <li>Secure airway IMMEDIATELY - early intubation recommended</li>
                <li>High-flow oxygen therapy</li>
                <li>Prepare for emergency tracheostomy</li>
                <li>Increase fluid resuscitation by 30-50%</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={calculate}
        disabled={!weight || !age}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
      >
        <Calculator className="w-5 h-5" />
        Calculate Burns Management Plan
      </button>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">
          <div className="border-t-2 border-gray-200 pt-6">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {/* TBSA */}
              <div className={`rounded-lg p-4 text-center ${
                result.tbsa < 10 ? 'bg-green-100' :
                result.tbsa < 20 ? 'bg-yellow-100' :
                result.tbsa < 40 ? 'bg-orange-100' : 'bg-red-100'
              }`}>
                <p className="text-4xl font-bold">{result.tbsa.toFixed(1)}%</p>
                <p className="font-semibold">TBSA Burned</p>
                <p className={`text-sm ${
                  result.severity === 'Minor' ? 'text-green-700' :
                  result.severity === 'Moderate' ? 'text-yellow-700' :
                  result.severity === 'Major' ? 'text-orange-700' : 'text-red-700'
                }`}>
                  {result.severity} Burn
                </p>
              </div>

              {/* ABSI Score */}
              <div className={`rounded-lg p-4 text-center ${
                result.absiScore <= 3 ? 'bg-green-100' :
                result.absiScore <= 5 ? 'bg-yellow-100' :
                result.absiScore <= 7 ? 'bg-orange-100' : 'bg-red-100'
              }`}>
                <p className="text-4xl font-bold">{result.absiScore}</p>
                <p className="font-semibold">ABSI Score</p>
                <p className="text-sm">{result.absiPrognosis}</p>
                <p className="text-xs text-gray-600">Survival: {result.absiSurvival}</p>
              </div>

              {/* Fluid Requirement */}
              <div className="bg-blue-100 rounded-lg p-4 text-center">
                <Droplets className="w-6 h-6 mx-auto text-blue-600 mb-1" />
                <p className="text-2xl font-bold">{result.parklandFluid.totalFluid24h.toLocaleString()} mL</p>
                <p className="font-semibold text-sm">24-hour Fluid (Parkland)</p>
                <p className="text-xs text-gray-600">Ringer's Lactate</p>
              </div>
            </div>

            {/* Fluid Resuscitation Details */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                <Droplets className="w-5 h-5" />
                Parkland Fluid Resuscitation
              </h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold">First 8 hours:</p>
                  <p>{result.parklandFluid.first8Hours.toLocaleString()} mL total</p>
                  <p className="text-blue-700 font-medium">
                    Rate: {result.parklandFluid.hourlyFirst8} mL/hour
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Next 16 hours:</p>
                  <p>{result.parklandFluid.next16Hours.toLocaleString()} mL total</p>
                  <p className="text-blue-700 font-medium">
                    Rate: {result.parklandFluid.hourlyNext16} mL/hour
                  </p>
                </div>
              </div>
              {result.fluidAdjustment && (
                <p className="mt-2 text-sm bg-yellow-100 p-2 rounded">
                  ⏰ {result.fluidAdjustment}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-600">
                Note: Fluid should be titrated to maintain urine output 0.5-1 mL/kg/h (adults) or 1-2 mL/kg/h (children)
              </p>
            </div>

            {/* Referral Criteria */}
            {result.referralCriteria.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-red-800 mb-2">⚠️ Burns Centre Referral Criteria Met:</h4>
                <ul className="list-disc ml-6 text-sm text-red-700">
                  {result.referralCriteria.map((criteria, index) => (
                    <li key={index}>{criteria}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Wound Care */}
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-green-800 mb-2">Wound Care Protocol:</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.woundCare.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Pain Management */}
            <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-purple-800 mb-2">Pain Management:</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.painManagement.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Nutrition */}
            <div className="bg-amber-50 border-l-4 border-amber-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-amber-800 mb-2">Nutritional Requirements:</h4>
              <div className="text-sm text-gray-700">
                <p><strong>Daily Caloric Needs:</strong> {result.nutritionNeeds.calories.toLocaleString()} kcal/day</p>
                <p><strong>Daily Protein Needs:</strong> {result.nutritionNeeds.protein} g/day</p>
                <p className="mt-2 text-xs">
                  Formula: 25 kcal/kg + 40 kcal/%TBSA (calories) | 1.5 g/kg + 3 g/%TBSA (protein)
                </p>
              </div>
            </div>

            {/* Tetanus & Antibiotics */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded-r-lg">
                <h4 className="font-bold text-indigo-800 mb-2">Tetanus Prophylaxis:</h4>
                <p className="text-sm text-gray-700">{result.tetanusRecommendation}</p>
              </div>
              <div className="bg-pink-50 border-l-4 border-pink-600 p-4 rounded-r-lg">
                <h4 className="font-bold text-pink-800 mb-2">Antibiotic Guidance:</h4>
                <p className="text-sm text-gray-700">{result.antibioticGuidance}</p>
              </div>
            </div>

            {/* Monitoring */}
            <div className="bg-gray-50 border-l-4 border-gray-600 p-4 rounded-r-lg">
              <h4 className="font-bold text-gray-800 mb-2">Monitoring Parameters:</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.monitoring.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
