// Braden Scale Calculator - Pressure Sore/Ulcer Risk Assessment
// WHO-Adapted Pressure Injury Prevention

import { useState } from 'react';
import { Shield, Calculator, AlertCircle, Activity } from 'lucide-react';
import { PatientCalculatorInfo, BradenResult } from '../../types';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function BradenScaleCalculator({ patientInfo }: Props) {
  // Braden Scale Components (1-4, lower = worse)
  const [sensoryPerception, setSensoryPerception] = useState(4);
  const [moisture, setMoisture] = useState(4);
  const [activity, setActivity] = useState(4);
  const [mobility, setMobility] = useState(4);
  const [nutrition, setNutrition] = useState(4);
  const [frictionShear, setFrictionShear] = useState(3); // 1-3 scale
  
  const [result, setResult] = useState<BradenResult | null>(null);

  const sensoryOptions = [
    { value: 1, label: 'Completely Limited', description: 'Unresponsive to painful stimuli, limited ability to feel pain over most of body' },
    { value: 2, label: 'Very Limited', description: 'Responds only to painful stimuli. Cannot communicate discomfort except by moaning or restlessness' },
    { value: 3, label: 'Slightly Limited', description: 'Responds to verbal commands, but cannot always communicate discomfort or the need to be turned' },
    { value: 4, label: 'No Impairment', description: 'Responds to verbal commands. Has no sensory deficit which would limit ability to feel or voice pain/discomfort' },
  ];

  const moistureOptions = [
    { value: 1, label: 'Constantly Moist', description: 'Skin is kept moist almost constantly by perspiration, urine, etc. Dampness detected every time patient is moved/turned' },
    { value: 2, label: 'Very Moist', description: 'Skin is often, but not always, moist. Linen must be changed at least once a shift' },
    { value: 3, label: 'Occasionally Moist', description: 'Skin is occasionally moist, requiring an extra linen change approximately once a day' },
    { value: 4, label: 'Rarely Moist', description: 'Skin is usually dry; linen requires changing only at routine intervals' },
  ];

  const activityOptions = [
    { value: 1, label: 'Bedfast', description: 'Confined to bed' },
    { value: 2, label: 'Chairfast', description: 'Ability to walk severely limited or non-existent. Cannot bear own weight and/or must be assisted into chair/wheelchair' },
    { value: 3, label: 'Walks Occasionally', description: 'Walks occasionally during day, but for very short distances, with or without assistance. Spends majority of shift in bed/chair' },
    { value: 4, label: 'Walks Frequently', description: 'Walks outside room at least twice a day and inside room at least once every two hours during waking hours' },
  ];

  const mobilityOptions = [
    { value: 1, label: 'Completely Immobile', description: 'Does not make even slight changes in body or extremity position without assistance' },
    { value: 2, label: 'Very Limited', description: 'Makes occasional slight changes in body or extremity position but unable to make frequent or significant changes independently' },
    { value: 3, label: 'Slightly Limited', description: 'Makes frequent though slight changes in body or extremity position independently' },
    { value: 4, label: 'No Limitation', description: 'Makes major and frequent changes in position without assistance' },
  ];

  const nutritionOptions = [
    { value: 1, label: 'Very Poor', description: 'Never eats a complete meal. Rarely eats more than 1/3 of any food offered. Eats 2 servings or less of protein (meat/dairy) per day. Takes fluids poorly. Does not take a liquid dietary supplement OR is NPO and/or maintained on clear liquids or IVs for >5 days' },
    { value: 2, label: 'Probably Inadequate', description: 'Rarely eats a complete meal and generally eats only about 1/2 of any food offered. Protein intake includes only 3 servings of meat/dairy per day. Occasionally will take a dietary supplement OR receives less than optimum amount of liquid diet or tube feeding' },
    { value: 3, label: 'Adequate', description: 'Eats over half of most meals. Eats 4 servings of protein (meat/dairy) per day. Occasionally will refuse a meal, but will usually take a supplement when offered OR is on a tube feeding/TPN regimen which probably meets most of nutritional needs' },
    { value: 4, label: 'Excellent', description: 'Eats most of every meal. Never refuses a meal. Usually eats 4 or more servings of meat/dairy. Occasionally eats between meals. Does not require supplementation' },
  ];

  const frictionOptions = [
    { value: 1, label: 'Problem', description: 'Requires moderate to maximum assistance in moving. Complete lifting without sliding against sheets is impossible. Frequently slides down in bed/chair, requiring frequent repositioning with maximum assistance. Spasticity, contractures or agitation leads to almost constant friction' },
    { value: 2, label: 'Potential Problem', description: 'Moves feebly or requires minimum assistance. During a move, skin probably slides to some extent against sheets, chair, restraints or other devices. Maintains relatively good position in chair/bed most of time but occasionally slides down' },
    { value: 3, label: 'No Apparent Problem', description: 'Moves in bed and in chair independently and has sufficient muscle strength to lift up completely during move. Maintains good position in bed/chair' },
  ];

  const calculate = () => {
    const totalScore = sensoryPerception + moisture + activity + mobility + nutrition + frictionShear;
    
    // Risk stratification
    let riskLevel: 'No Risk' | 'Mild Risk' | 'Moderate Risk' | 'High Risk' | 'Very High Risk';
    let riskColor: string;
    let turningSchedule: string;
    let interventions: string[] = [];
    let preventionMeasures: string[] = [];
    let supportSurfaces: string[] = [];
    let nutritionRecommendations: string[] = [];
    let skinCare: string[] = [];
    
    if (totalScore >= 19) {
      riskLevel = 'No Risk';
      turningSchedule = 'Standard care - reposition every 4 hours or as needed';
      interventions = [
        'Continue standard nursing care',
        'Maintain current nutrition and hydration',
        'Encourage mobility as tolerated',
        'Re-assess weekly or with condition change',
      ];
      preventionMeasures = [
        'Standard hospital mattress acceptable',
        'Routine skin inspection during care',
        'Maintain good hygiene',
      ];
    } else if (totalScore >= 15 && totalScore <= 18) {
      riskLevel = 'Mild Risk';
      turningSchedule = 'Reposition every 2-4 hours';
      interventions = [
        'Increase repositioning frequency',
        'Consider pressure-relieving mattress overlay',
        'Optimize nutrition',
        'Re-assess twice weekly',
      ];
      preventionMeasures = [
        'Foam mattress overlay recommended',
        'Heel protection for bedridden patients',
        'Use pillows for positioning',
        'Avoid prolonged sitting (>2 hours)',
      ];
      supportSurfaces = [
        'Foam overlay mattress',
        'Heel protectors/pillows',
      ];
    } else if (totalScore >= 13 && totalScore <= 14) {
      riskLevel = 'Moderate Risk';
      turningSchedule = 'Reposition every 2 hours minimum';
      interventions = [
        'Strict 2-hourly repositioning protocol',
        'Pressure-redistributing mattress essential',
        'Nutritional assessment and supplementation',
        'Daily skin assessment and documentation',
        'Consider dietitian referral',
      ];
      preventionMeasures = [
        'Pressure-redistributing mattress required',
        'Heel elevation mandatory',
        'Use 30° lateral positions',
        'Avoid head of bed >30° unless medically necessary',
        'Chair cushion for sitting periods',
      ];
      supportSurfaces = [
        'Static pressure redistribution mattress',
        'Foam or gel chair cushion',
        'Heel elevation devices',
      ];
      nutritionRecommendations = [
        'Protein supplementation: 1.25-1.5 g/kg/day',
        'Consider oral nutritional supplements',
        'Vitamin C 500mg daily',
        'Zinc 15-20mg daily',
      ];
    } else if (totalScore >= 10 && totalScore <= 12) {
      riskLevel = 'High Risk';
      turningSchedule = 'Reposition every 1-2 hours';
      interventions = [
        '⚠️ High-risk pressure injury prevention protocol',
        'Strict 1-2 hourly repositioning',
        'Dynamic/alternating pressure mattress',
        'Comprehensive nutritional support',
        'Daily multidisciplinary skin rounds',
        'Document all interventions meticulously',
      ];
      preventionMeasures = [
        'Alternating pressure air mattress (APAM)',
        'Floating heels at all times',
        'Barrier cream for moisture management',
        'Reduce friction with transfer sheets',
        'Limit chair sitting to 1 hour maximum',
        'Silicone foam dressings on high-risk areas prophylactically',
      ];
      supportSurfaces = [
        'Alternating pressure air mattress (priority)',
        'Low air loss mattress',
        'Specialized wheelchair cushion',
        'Prophylactic silicone dressings (sacrum, heels)',
      ];
      nutritionRecommendations = [
        'High-protein diet: 1.5-2 g/kg/day',
        'Oral nutritional supplements 2-3 times daily',
        'Vitamin C 1000mg daily',
        'Zinc 40mg daily',
        'Consider enteral feeding if oral intake inadequate',
      ];
      skinCare = [
        'Inspect skin at every repositioning',
        'Apply barrier cream/ointment to moisture-prone areas',
        'Keep skin clean and dry',
        'Use pH-balanced cleansers',
        'Apply moisturizer to dry areas',
      ];
    } else {
      riskLevel = 'Very High Risk';
      turningSchedule = 'Continuous repositioning - every 1 hour or more frequently';
      interventions = [
        '🚨 CRITICAL - Maximum pressure injury prevention',
        'Hourly repositioning or more frequent',
        'Specialty bed/mattress mandatory',
        'Intensive nutritional support',
        'Consider turning team/mechanical aids',
        'Daily wound/tissue viability specialist review',
        'Continuous skin monitoring',
      ];
      preventionMeasures = [
        'Low air loss or fluidized bed',
        'Specialty turning/positioning system',
        'Comprehensive moisture management',
        'Prophylactic dressings on ALL bony prominences',
        'Minimize all pressure, friction, and shear',
        'Air-fluidized therapy if available',
      ];
      supportSurfaces = [
        'Low air loss bed (1st choice)',
        'Air-fluidized therapy bed if available',
        'Specialty positioning devices',
        'Full heel offloading devices',
        'Prophylactic silicone foam on sacrum, heels, elbows, occiput',
      ];
      nutritionRecommendations = [
        '⚡ Aggressive nutritional support essential',
        'Protein: 2 g/kg/day minimum',
        'Multiple oral supplements or tube feeding',
        'Vitamin C 1000-2000mg daily',
        'Zinc 40mg daily',
        'Arginine supplementation if tolerated',
        'Consider parenteral nutrition if enteral fails',
      ];
      skinCare = [
        'Inspect skin continuously',
        'Document any changes immediately',
        'Barrier products on all at-risk areas',
        'Incontinence management critical',
        'Consider urinary catheter if incontinence uncontrolled',
        'Maintain skin pH balance',
      ];
    }

    // High-risk body sites
    const highRiskSites = [
      'Sacrum/coccyx (most common)',
      'Heels (especially lateral)',
      'Ischial tuberosities (sitting)',
      'Greater trochanters (side-lying)',
      'Occiput (especially in ICU patients)',
      'Ears (oxygen mask/tubing)',
      'Shoulders/scapulae',
      'Elbows',
      'Malleoli (ankles)',
    ];

    // Score breakdown
    const scoreBreakdown = {
      sensoryPerception: { score: sensoryPerception, label: sensoryOptions.find(o => o.value === sensoryPerception)?.label || '' },
      moisture: { score: moisture, label: moistureOptions.find(o => o.value === moisture)?.label || '' },
      activity: { score: activity, label: activityOptions.find(o => o.value === activity)?.label || '' },
      mobility: { score: mobility, label: mobilityOptions.find(o => o.value === mobility)?.label || '' },
      nutrition: { score: nutrition, label: nutritionOptions.find(o => o.value === nutrition)?.label || '' },
      frictionShear: { score: frictionShear, label: frictionOptions.find(o => o.value === frictionShear)?.label || '' },
    };

    // Identify problem areas (score ≤2)
    const problemAreas: string[] = [];
    if (sensoryPerception <= 2) problemAreas.push('Sensory Perception');
    if (moisture <= 2) problemAreas.push('Moisture');
    if (activity <= 2) problemAreas.push('Activity');
    if (mobility <= 2) problemAreas.push('Mobility');
    if (nutrition <= 2) problemAreas.push('Nutrition');
    if (frictionShear <= 1) problemAreas.push('Friction & Shear');

    const calculationResult: BradenResult = {
      totalScore,
      riskLevel,
      scoreBreakdown,
      problemAreas,
      turningSchedule,
      interventions,
      preventionMeasures,
      supportSurfaces,
      nutritionRecommendations,
      skinCare,
      highRiskSites,
      reassessmentFrequency: riskLevel === 'Very High Risk' ? 'Daily' : 
                             riskLevel === 'High Risk' ? 'Every 2-3 days' :
                             riskLevel === 'Moderate Risk' ? 'Twice weekly' :
                             riskLevel === 'Mild Risk' ? 'Weekly' : 'With condition change',
    };
    
    setResult(calculationResult);
  };

  const renderScaleSelector = (
    title: string,
    options: { value: number; label: string; description: string }[],
    value: number,
    onChange: (value: number) => void
  ) => (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="font-semibold text-gray-800 mb-3">{title}</h4>
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border-2 transition-all ${
              value === option.value
                ? 'border-sky-500 bg-sky-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-white'
            }`}
          >
            <input
              type="radio"
              name={title}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-1 w-4 h-4 text-sky-600"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                  option.value === 1 ? 'bg-red-200 text-red-800' :
                  option.value === 2 ? 'bg-orange-200 text-orange-800' :
                  option.value === 3 ? 'bg-yellow-200 text-yellow-800' :
                  'bg-green-200 text-green-800'
                }`}>
                  {option.value}
                </span>
                <span className="font-medium">{option.label}</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">{option.description}</p>
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
        <h2 className="text-2xl font-bold text-gray-800">Braden Scale Calculator</h2>
      </div>

      <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-6 rounded-r-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Braden Scale for Predicting Pressure Sore Risk</p>
            <p>Score range: 6-23. Lower scores indicate higher risk. Assess all hospitalized patients on admission and regularly thereafter.</p>
          </div>
        </div>
      </div>

      {/* Assessment Sections */}
      <div className="space-y-4 mb-6">
        {renderScaleSelector('1. Sensory Perception', sensoryOptions, sensoryPerception, setSensoryPerception)}
        {renderScaleSelector('2. Moisture', moistureOptions, moisture, setMoisture)}
        {renderScaleSelector('3. Activity', activityOptions, activity, setActivity)}
        {renderScaleSelector('4. Mobility', mobilityOptions, mobility, setMobility)}
        {renderScaleSelector('5. Nutrition', nutritionOptions, nutrition, setNutrition)}
        {renderScaleSelector('6. Friction & Shear', frictionOptions, frictionShear, setFrictionShear)}
      </div>

      {/* Current Score Display */}
      <div className="bg-gray-100 rounded-lg p-4 mb-4 text-center">
        <p className="text-lg">
          Current Score: <span className="text-2xl font-bold text-purple-600">
            {sensoryPerception + moisture + activity + mobility + nutrition + frictionShear}
          </span> / 23
        </p>
      </div>

      <button
        onClick={calculate}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Calculator className="w-5 h-5" />
        Calculate Pressure Ulcer Risk
      </button>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">
          <div className="border-t-2 border-gray-200 pt-6">
            {/* Score Summary */}
            <div className={`rounded-lg p-6 mb-6 text-center ${
              result.riskLevel === 'No Risk' ? 'bg-green-100' :
              result.riskLevel === 'Mild Risk' ? 'bg-blue-100' :
              result.riskLevel === 'Moderate Risk' ? 'bg-yellow-100' :
              result.riskLevel === 'High Risk' ? 'bg-orange-100' : 'bg-red-100'
            }`}>
              <p className={`text-5xl font-bold mb-2 ${
                result.riskLevel === 'No Risk' ? 'text-green-600' :
                result.riskLevel === 'Mild Risk' ? 'text-blue-600' :
                result.riskLevel === 'Moderate Risk' ? 'text-yellow-600' :
                result.riskLevel === 'High Risk' ? 'text-orange-600' : 'text-red-600'
              }`}>
                {result.totalScore}/23
              </p>
              <p className="text-2xl font-semibold text-gray-800">{result.riskLevel}</p>
              <p className="text-sm text-gray-600 mt-2">
                Reassess: {result.reassessmentFrequency}
              </p>
            </div>

            {/* Score Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold mb-3">Score Breakdown:</h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(result.scoreBreakdown).map(([key, { score, label }]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <span className={`font-bold px-2 py-0.5 rounded ${
                      score <= 1 ? 'bg-red-200 text-red-800' :
                      score === 2 ? 'bg-orange-200 text-orange-800' :
                      score === 3 ? 'bg-yellow-200 text-yellow-800' :
                      'bg-green-200 text-green-800'
                    }`}>{score}</span>
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: {label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Problem Areas */}
            {result.problemAreas.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-red-800 mb-2">⚠️ Priority Problem Areas (Score ≤2):</h4>
                <div className="flex flex-wrap gap-2">
                  {result.problemAreas.map((area, index) => (
                    <span key={index} className="bg-red-200 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Turning Schedule */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Repositioning Schedule:
              </h4>
              <p className="text-lg font-semibold">{result.turningSchedule}</p>
            </div>

            {/* Interventions */}
            <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-purple-800 mb-2">Interventions:</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.interventions.map((item, index) => (
                  <li key={index} className={item.includes('⚠️') || item.includes('🚨') ? 'font-semibold text-red-600' : ''}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Support Surfaces */}
            {result.supportSurfaces.length > 0 && (
              <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-indigo-800 mb-2">Support Surface Recommendations:</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.supportSurfaces.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prevention Measures */}
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-green-800 mb-2">Prevention Measures:</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.preventionMeasures.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Nutrition Recommendations */}
            {result.nutritionRecommendations.length > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-600 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-amber-800 mb-2">Nutrition for Wound Healing:</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.nutritionRecommendations.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skin Care */}
            {result.skinCare.length > 0 && (
              <div className="bg-pink-50 border-l-4 border-pink-600 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-pink-800 mb-2">Skin Care Protocol:</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.skinCare.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* High Risk Sites */}
            <div className="bg-gray-50 border-l-4 border-gray-600 p-4 rounded-r-lg">
              <h4 className="font-bold text-gray-800 mb-2">High-Risk Body Sites to Monitor:</h4>
              <div className="grid md:grid-cols-3 gap-1 text-sm text-gray-700">
                {result.highRiskSites.map((site, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                    {site}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
