// Braden Scale Calculator - Pressure Ulcer/Injury Risk Assessment
// WHO-Adapted Pressure Injury Prevention Protocol

import { useState } from 'react';
import { Shield, Calculator, AlertCircle, Bed } from 'lucide-react';
import { PatientCalculatorInfo, BradenResult } from '../../types';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function BradenCalculator({ patientInfo: _patientInfo }: Props) {
  // Sensory Perception (1-4)
  const [sensoryPerception, setSensoryPerception] = useState(4);
  // Moisture (1-4)
  const [moisture, setMoisture] = useState(4);
  // Activity (1-4)
  const [activity, setActivity] = useState(4);
  // Mobility (1-4)
  const [mobility, setMobility] = useState(4);
  // Nutrition (1-4)
  const [nutrition, setNutrition] = useState(4);
  // Friction & Shear (1-3)
  const [frictionShear, setFrictionShear] = useState(3);
  
  const [result, setResult] = useState<BradenResult | null>(null);

  const sensoryOptions = [
    { value: 1, label: 'Completely Limited', description: 'Unresponsive to painful stimuli OR limited ability to feel pain over most of body surface' },
    { value: 2, label: 'Very Limited', description: 'Responds only to painful stimuli. Cannot communicate discomfort OR sensory impairment limits ability to feel pain over 1/2 of body' },
    { value: 3, label: 'Slightly Limited', description: 'Responds to verbal commands but cannot always communicate discomfort OR has sensory impairment limiting ability in 1-2 extremities' },
    { value: 4, label: 'No Impairment', description: 'Responds to verbal commands. Has no sensory deficit which would limit ability to feel or voice pain or discomfort' },
  ];

  const moistureOptions = [
    { value: 1, label: 'Constantly Moist', description: 'Skin is kept moist almost constantly by perspiration, urine, etc. Dampness detected every time patient is moved or turned' },
    { value: 2, label: 'Very Moist', description: 'Skin is often, but not always moist. Linen must be changed at least once per shift' },
    { value: 3, label: 'Occasionally Moist', description: 'Skin is occasionally moist, requiring extra linen change approximately once a day' },
    { value: 4, label: 'Rarely Moist', description: 'Skin is usually dry. Linen only requires changing at routine intervals' },
  ];

  const activityOptions = [
    { value: 1, label: 'Bedfast', description: 'Confined to bed' },
    { value: 2, label: 'Chairfast', description: 'Ability to walk severely limited or non-existent. Cannot bear own weight and must be assisted into chair or wheelchair' },
    { value: 3, label: 'Walks Occasionally', description: 'Walks occasionally during day, but for very short distances, with or without assistance. Spends majority of each shift in bed or chair' },
    { value: 4, label: 'Walks Frequently', description: 'Walks outside room at least twice a day and inside room at least once every two hours during waking hours' },
  ];

  const mobilityOptions = [
    { value: 1, label: 'Completely Immobile', description: 'Does not make even slight changes in body or extremity position without assistance' },
    { value: 2, label: 'Very Limited', description: 'Makes occasional slight changes in body or extremity position but unable to make frequent or significant changes independently' },
    { value: 3, label: 'Slightly Limited', description: 'Makes frequent though slight changes in body or extremity position independently' },
    { value: 4, label: 'No Limitations', description: 'Makes major and frequent changes in position without assistance' },
  ];

  const nutritionOptions = [
    { value: 1, label: 'Very Poor', description: 'Never eats a complete meal. Rarely eats >1/3 of food offered. Eats 2 servings or less of protein per day. Takes fluids poorly. Does not take liquid supplement. OR NPO and/or maintained on clear liquids or IV for >5 days' },
    { value: 2, label: 'Probably Inadequate', description: 'Rarely eats complete meal and generally eats only about 1/2 of food offered. Protein intake 3 servings daily. Occasionally takes dietary supplement. OR receives less than optimal amount of liquid diet or tube feeding' },
    { value: 3, label: 'Adequate', description: 'Eats over half of most meals. Eats 4 servings of protein each day. Occasionally refuses a meal, but will usually take a supplement. OR is on tube feeding or TPN which meets most nutritional needs' },
    { value: 4, label: 'Excellent', description: 'Eats most of every meal. Never refuses a meal. Usually eats 4+ servings of meat and dairy products. Occasionally eats between meals. Does not require supplementation' },
  ];

  const frictionShearOptions = [
    { value: 1, label: 'Problem', description: 'Requires moderate to maximum assistance in moving. Complete lifting without sliding against sheets is impossible. Frequently slides down in bed or chair. Spasticity, contractures, or agitation leads to almost constant friction' },
    { value: 2, label: 'Potential Problem', description: 'Moves feebly or requires minimum assistance. During move, skin probably slides to some extent against sheets, chair, restraints, or other devices. Maintains relatively good position in chair or bed most of time but occasionally slides down' },
    { value: 3, label: 'No Apparent Problem', description: 'Moves in bed and in chair independently and has sufficient muscle strength to lift up completely during move. Maintains good position in bed or chair at all times' },
  ];

  const calculate = () => {
    const totalScore = sensoryPerception + moisture + activity + mobility + nutrition + frictionShear;
    
    // Risk category
    let riskLevel: 'Very High' | 'High' | 'Moderate' | 'Mild' | 'No Risk';
    let interventions: string[] = [];
    let turningSchedule: string;
    let supportSurface: string;
    let skinCare: string[] = [];
    let monitoring: string[] = [];
    
    if (totalScore <= 9) {
      riskLevel = 'Very High';
      turningSchedule = 'Every 1-2 hours (q1-2h)';
      supportSurface = 'Low air loss bed or alternating pressure mattress REQUIRED';
      interventions = [
        '⚠️ IMMEDIATE pressure injury prevention protocol',
        'Specialty bed (low air loss or alternating pressure mattress)',
        'Turn patient every 1-2 hours using turning schedule',
        'Use 30-degree lateral tilt (avoid 90-degree side-lying)',
        'Float heels off bed with pillows',
        'Pressure-redistributing seat cushion if sitting',
        'Moisture barrier cream to all at-risk areas',
        'Nutritional assessment and supplementation',
        'Consider wound care nurse consultation',
      ];
      skinCare = [
        'Full skin inspection with each repositioning',
        'Document all findings on body map',
        'Apply moisture barrier cream to sacrum, heels, and bony prominences',
        'Keep skin clean and dry',
        'Pat skin dry - never rub',
        'Use pH-balanced skin cleanser',
      ];
      monitoring = [
        'Comprehensive skin inspection q shift AND with each turn',
        'Document on pressure injury risk form',
        'Photo documentation of any skin changes',
        'Daily reassessment of Braden score',
      ];
    } else if (totalScore <= 12) {
      riskLevel = 'High';
      turningSchedule = 'Every 2 hours (q2h)';
      supportSurface = 'Pressure-redistributing mattress (foam or overlay)';
      interventions = [
        'Pressure-redistributing mattress or overlay',
        'Turn patient every 2 hours',
        '30-degree lateral positioning',
        'Heel protection (pillows, heel protectors)',
        'Pressure-redistributing cushion for sitting',
        'Nutritional optimization',
        'Incontinence care plan if applicable',
        'Manage moisture with barrier products',
      ];
      skinCare = [
        'Full skin inspection every shift',
        'Apply protective cream to at-risk areas (sacrum, heels, elbows)',
        'Keep skin clean and appropriately moisturized',
        'Address any incontinence promptly',
      ];
      monitoring = [
        'Skin inspection every shift',
        'Document any changes',
        'Weekly Braden reassessment',
      ];
    } else if (totalScore <= 14) {
      riskLevel = 'Moderate';
      turningSchedule = 'Every 2-3 hours (q2-3h)';
      supportSurface = 'Foam mattress overlay or pressure-redistributing mattress';
      interventions = [
        'Foam mattress overlay',
        'Turn every 2-3 hours',
        'Heel and elbow protection if prolonged bed rest',
        'Encourage mobility and repositioning',
        'Nutritional support as needed',
        'Manage moisture appropriately',
      ];
      skinCare = [
        'Skin inspection each shift',
        'Moisturize dry skin',
        'Manage incontinence with appropriate products',
      ];
      monitoring = [
        'Daily skin checks to high-risk areas',
        'Weekly Braden reassessment',
      ];
    } else if (totalScore <= 18) {
      riskLevel = 'Mild';
      turningSchedule = 'Every 3-4 hours or self-repositioning encouraged';
      supportSurface = 'Standard hospital mattress may be adequate';
      interventions = [
        'Encourage frequent repositioning',
        'Standard mattress with foam overlay if immobile',
        'Regular skin inspection',
        'Adequate nutrition and hydration',
        'Early mobilization',
      ];
      skinCare = [
        'Regular skin inspection during routine care',
        'Maintain skin integrity with moisturizers',
      ];
      monitoring = [
        'Skin checks during routine care',
        'Reassess if condition changes',
      ];
    } else {
      riskLevel = 'No Risk';
      turningSchedule = 'Self-repositioning, standard care';
      supportSurface = 'Standard mattress';
      interventions = [
        'No specific pressure injury prevention needed',
        'Routine skin care',
        'Encourage activity and mobility',
        'Adequate nutrition and hydration',
      ];
      skinCare = [
        'Standard skin care',
        'Routine hygiene',
      ];
      monitoring = [
        'Standard nursing assessment',
        'Reassess if patient condition changes',
      ];
    }
    
    // High-risk areas
    const highRiskAreas = [
      'Sacrum/Coccyx (most common)',
      'Heels (bilateral)',
      'Ischial tuberosities (sitting)',
      'Greater trochanters (side-lying)',
      'Occiput (head of bed elevated)',
      'Elbows',
      'Shoulder blades',
      'Ears (oxygen tubing)',
    ];
    
    // Equipment recommendations based on score
    const equipmentList: string[] = [];
    if (totalScore <= 12) {
      equipmentList.push('Low air loss or alternating pressure mattress');
      equipmentList.push('Heel elevation devices or pillows');
      equipmentList.push('Pressure-redistributing seat cushion');
      equipmentList.push('Trapeze bar if able to assist with repositioning');
      equipmentList.push('Draw sheets for repositioning (avoid dragging)');
      equipmentList.push('Moisture barrier cream (zinc oxide or dimethicone)');
    } else if (totalScore <= 18) {
      equipmentList.push('Foam mattress overlay');
      equipmentList.push('Pillows for positioning');
      equipmentList.push('Heel protectors if indicated');
    }
    
    // Nigerian context adaptations
    const resourceLimitedOptions = [
      'If specialty beds unavailable: Use egg crate mattress or multiple foam layers',
      'Make turning schedule charts and post at bedside',
      'Train family caregivers on repositioning techniques',
      'Use available materials: folded towels, cloth pads for positioning',
      'Local alternatives: Shea butter can be used as skin moisturizer',
      'Improvise heel protection: soft pillows, folded cloths',
    ];
    
    // Score breakdown
    const subscoreAnalysis = {
      sensoryPerception: { score: sensoryPerception, max: 4, name: 'Sensory Perception' },
      moisture: { score: moisture, max: 4, name: 'Moisture' },
      activity: { score: activity, max: 4, name: 'Activity' },
      mobility: { score: mobility, max: 4, name: 'Mobility' },
      nutrition: { score: nutrition, max: 4, name: 'Nutrition' },
      frictionShear: { score: frictionShear, max: 3, name: 'Friction & Shear' },
    };
    
    const lowestScores = Object.entries(subscoreAnalysis)
      .filter(([_, data]) => data.score <= 2)
      .map(([_, data]) => data.name);
    
    const calculationResult: BradenResult = {
      totalScore,
      riskLevel,
      subscores: subscoreAnalysis,
      interventions,
      turningSchedule,
      supportSurface,
      skinCare,
      monitoring,
      highRiskAreas,
      equipmentList,
      resourceLimitedOptions,
      lowestScores,
    };
    
    setResult(calculationResult);
  };

  const renderScaleSection = (
    title: string,
    value: number,
    setValue: (v: number) => void,
    options: Array<{ value: number; label: string; description: string }>
  ) => (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-bold text-gray-800 mb-3">{title}</h3>
      <div className="space-y-2">
        {options.map((option) => (
          <label 
            key={option.value} 
            className={`flex items-start gap-3 p-3 rounded cursor-pointer border-2 transition-colors ${
              value === option.value 
                ? 'bg-blue-50 border-blue-500' 
                : 'hover:bg-gray-100 border-transparent'
            }`}
          >
            <input
              type="radio"
              name={title}
              value={option.value}
              checked={value === option.value}
              onChange={() => setValue(option.value)}
              className="w-4 h-4 mt-1 text-blue-600"
            />
            <div className="flex-1">
              <p className="font-medium">
                {option.value}. {option.label}
              </p>
              <p className="text-xs text-gray-600">{option.description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-7 h-7 text-purple-600" />
        <h2 className="text-2xl font-bold text-gray-800">Braden Scale - Pressure Injury Risk</h2>
      </div>

      <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-6 rounded-r-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Braden Scale for Predicting Pressure Sore Risk</p>
            <p>Validated tool to assess risk of pressure ulcer development. Score range: 6-23. Lower scores indicate higher risk.</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {renderScaleSection('1. Sensory Perception', sensoryPerception, setSensoryPerception, sensoryOptions)}
        {renderScaleSection('2. Moisture', moisture, setMoisture, moistureOptions)}
        {renderScaleSection('3. Activity', activity, setActivity, activityOptions)}
        {renderScaleSection('4. Mobility', mobility, setMobility, mobilityOptions)}
        {renderScaleSection('5. Nutrition', nutrition, setNutrition, nutritionOptions)}
        {renderScaleSection('6. Friction & Shear', frictionShear, setFrictionShear, frictionShearOptions)}
      </div>

      {/* Current Score Preview */}
      <div className="bg-gray-100 rounded-lg p-4 mb-6">
        <p className="text-center text-lg">
          <strong>Current Total Score:</strong>{' '}
          <span className="text-2xl font-bold text-purple-600">
            {sensoryPerception + moisture + activity + mobility + nutrition + frictionShear}
          </span>
          <span className="text-gray-500"> / 23</span>
        </p>
      </div>

      <button
        onClick={calculate}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Calculator className="w-5 h-5" />
        Calculate Risk & Generate Care Plan
      </button>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">
          <div className="border-t-2 border-gray-200 pt-6">
            {/* Score Summary */}
            <div className={`rounded-lg p-6 mb-6 text-center ${
              result.riskLevel === 'Very High' ? 'bg-red-100' :
              result.riskLevel === 'High' ? 'bg-orange-100' :
              result.riskLevel === 'Moderate' ? 'bg-yellow-100' :
              result.riskLevel === 'Mild' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              <p className={`text-5xl font-bold mb-2 ${
                result.riskLevel === 'Very High' ? 'text-red-600' :
                result.riskLevel === 'High' ? 'text-orange-600' :
                result.riskLevel === 'Moderate' ? 'text-yellow-600' :
                result.riskLevel === 'Mild' ? 'text-blue-600' : 'text-green-600'
              }`}>
                {result.totalScore}
              </p>
              <p className="text-2xl font-semibold text-gray-800">{result.riskLevel} Risk</p>
              <p className="text-sm text-gray-600 mt-2">Score range: 6 (highest risk) - 23 (lowest risk)</p>
            </div>

            {/* Subscores with visual bars */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold mb-3">Subscore Analysis:</h4>
              <div className="space-y-2">
                {result.subscores && Object.entries(result.subscores).map(([key, data]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-36 text-sm">{data.name || key}:</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          data.score <= 1 ? 'bg-red-500' :
                          data.score <= 2 ? 'bg-orange-500' :
                          data.score <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${(data.score / (data.max || 4)) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-sm font-medium">{data.score}/{data.max || 4}</span>
                  </div>
                ))}
              </div>
              {result.lowestScores && result.lowestScores.length > 0 && (
                <p className="mt-3 text-sm text-red-600 font-medium">
                  ⚠️ Priority areas for intervention: {result.lowestScores.join(', ')}
                </p>
              )}
            </div>

            {/* Interventions */}
            <div className={`border-l-4 p-4 mb-4 rounded-r-lg ${
              result.riskLevel === 'Very High' || result.riskLevel === 'High' 
                ? 'bg-red-50 border-red-600' 
                : 'bg-blue-50 border-blue-600'
            }`}>
              <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Bed className="w-5 h-5" />
                Recommended Interventions:
              </h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.interventions.map((item, index) => (
                  <li key={index} className={item.includes('⚠️') ? 'font-semibold text-red-600' : ''}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Turning Schedule & Support Surface */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r-lg">
                <h4 className="font-bold text-purple-800 mb-2">🔄 Turning Schedule:</h4>
                <p className="text-lg font-semibold">{result.turningSchedule}</p>
              </div>
              <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded-r-lg">
                <h4 className="font-bold text-indigo-800 mb-2">🛏️ Support Surface:</h4>
                <p className="text-sm">{result.supportSurface}</p>
              </div>
            </div>

            {/* Skin Care */}
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-green-800 mb-2">Skin Care Protocol:</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.skinCare.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* High Risk Areas */}
            <div className="bg-amber-50 border-l-4 border-amber-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-amber-800 mb-2">High-Risk Pressure Areas (Inspect Frequently):</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {result.highRiskAreas.map((area, index) => (
                  <span key={index} className="bg-white rounded px-2 py-1 text-center">
                    {area}
                  </span>
                ))}
              </div>
            </div>

            {/* Equipment */}
            {result.equipmentList.length > 0 && (
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-blue-800 mb-2">Equipment Checklist:</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.equipmentList.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Resource-Limited Settings */}
            <div className="bg-gray-100 border-l-4 border-gray-500 p-4 rounded-r-lg">
              <h4 className="font-bold text-gray-800 mb-2">🌍 Resource-Limited Setting Adaptations:</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.resourceLimitedOptions.map((item, index) => (
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
