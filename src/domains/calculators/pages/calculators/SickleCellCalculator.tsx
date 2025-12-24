// Sickle Cell Crisis Calculator
// Crisis Management, Hydroxyurea Dosing, and Exchange Transfusion Guidelines

import { useState } from 'react';
import { Heart, Calculator, AlertTriangle, Droplets, Activity, Thermometer } from 'lucide-react';
import { PatientCalculatorInfo, SickleCellResult } from '../../types';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function SickleCellCalculator({ patientInfo }: Props) {
  const [weight, setWeight] = useState(patientInfo.weight || '');
  const [age, setAge] = useState(patientInfo.age || '');
  const [hbLevel, setHbLevel] = useState('');
  const [hbS, setHbS] = useState(''); // HbS percentage
  const [reticulocyteCount, setReticulocyteCount] = useState('');
  
  // Crisis type
  const [crisisType, setCrisisType] = useState<string>('vaso-occlusive');
  
  // Severity indicators
  const [painScore, setPainScore] = useState<number>(5);
  const [hasFever, setHasFever] = useState(false);
  const [hasACS, setHasACS] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [hasPriapism, setHasPriapism] = useState(false);
  const [hasSplenic, setHasSplenic] = useState(false);
  const [hasAplastic, setHasAplastic] = useState(false);
  
  // Current treatment
  const [onHydroxyurea, setOnHydroxyurea] = useState(false);
  const [currentHUDose, setCurrentHUDose] = useState('');
  const [transfusionHistory, setTransfusionHistory] = useState<string>('none');
  
  const [result, setResult] = useState<SickleCellResult | null>(null);

  const crisisTypes = [
    { value: 'vaso-occlusive', label: 'Vaso-Occlusive Crisis (VOC)', description: 'Pain crisis - most common' },
    { value: 'acs', label: 'Acute Chest Syndrome', description: 'Pulmonary complication - emergency' },
    { value: 'aplastic', label: 'Aplastic Crisis', description: 'Parvovirus B19 - severe anemia' },
    { value: 'sequestration', label: 'Splenic Sequestration', description: 'Splenic pooling - children' },
    { value: 'hemolytic', label: 'Hemolytic Crisis', description: 'Acute hemolysis' },
    { value: 'stroke', label: 'Stroke/TIA', description: 'Cerebrovascular event - emergency' },
    { value: 'priapism', label: 'Priapism', description: 'Urological emergency' },
  ];

  const calculate = () => {
    const weightKg = parseFloat(weight);
    const ageYears = parseInt(age);
    const hb = parseFloat(hbLevel) || 8;
    const hbsPercent = parseFloat(hbS) || 0;
    
    // Determine severity
    let severity: 'Mild' | 'Moderate' | 'Severe' | 'Critical' = 'Moderate';
    const severityFactors: string[] = [];
    
    if (hasStroke || hasACS || hasSplenic) {
      severity = 'Critical';
      severityFactors.push('Life-threatening complication present');
    }
    if (hb < 5) {
      severity = 'Critical';
      severityFactors.push('Severe anemia (Hb < 5 g/dL)');
    } else if (hb < 6) {
      if (severity !== 'Critical') severity = 'Severe';
      severityFactors.push('Significant anemia (Hb < 6 g/dL)');
    }
    if (painScore >= 8) {
      if (severity !== 'Critical') severity = 'Severe';
      severityFactors.push('Severe pain (score ≥ 8)');
    } else if (painScore <= 4) {
      severity = 'Mild';
    }
    if (hasFever) {
      severityFactors.push('Fever present - rule out infection/ACS');
    }

    // Fluid management
    const maintenanceFluid = Math.round(((weightKg * 30) + 70));
    const hydrationRecommendation = [
      `Maintenance IV fluids: ${maintenanceFluid} mL/day (Normal Saline or D5NS)`,
      'Bolus: 10-20 mL/kg NS if dehydrated',
      'Oral hydration: 2-3L/day if tolerated',
      'Avoid over-hydration (risk of ACS)',
      'Target euvolemia - monitor fluid balance',
    ];

    // Pain management (WHO ladder adapted)
    const painManagement: string[] = [];
    if (painScore <= 3) {
      painManagement.push('Step 1: Paracetamol 1g PO q6h');
      painManagement.push('± NSAIDs (Ibuprofen 400mg TDS) if not contraindicated');
    } else if (painScore <= 6) {
      painManagement.push('Step 2: Tramadol 50-100mg PO/IV q6h');
      painManagement.push('+ Paracetamol 1g PO q6h');
      painManagement.push('Consider weak opioids');
    } else {
      painManagement.push('Step 3: Strong opioids indicated');
      painManagement.push('Morphine 0.1-0.15 mg/kg IV/SC q3-4h PRN');
      painManagement.push('OR PCA morphine if available');
      painManagement.push('+ Paracetamol 1g q6h');
      painManagement.push('+ Consider adjuvants (gabapentin, amitriptyline)');
      painManagement.push('Laxatives prophylactically with opioids');
    }

    // Transfusion guidelines
    const transfusionGuidelines: string[] = [];
    let transfusionIndicated = false;
    let exchangeTransfusion = false;
    
    if (hasStroke) {
      exchangeTransfusion = true;
      transfusionIndicated = true;
      transfusionGuidelines.push('🚨 EMERGENCY EXCHANGE TRANSFUSION INDICATED');
      transfusionGuidelines.push('Target HbS < 30%');
      transfusionGuidelines.push('Maintain Hb 10-11 g/dL');
    }
    if (hasACS && (hb < 9 || hbsPercent > 30)) {
      exchangeTransfusion = true;
      transfusionIndicated = true;
      transfusionGuidelines.push('⚠️ Exchange transfusion for severe ACS');
      transfusionGuidelines.push('Target HbS < 30%');
    } else if (hasACS) {
      transfusionIndicated = true;
      transfusionGuidelines.push('Simple transfusion to Hb 10-11 g/dL');
    }
    if (hasSplenic && hb < 6) {
      transfusionIndicated = true;
      transfusionGuidelines.push('Urgent transfusion for splenic sequestration');
      transfusionGuidelines.push('Transfuse cautiously - splenic autotransfusion may occur');
    }
    if (hasAplastic && hb < 6) {
      transfusionIndicated = true;
      transfusionGuidelines.push('Transfusion for aplastic crisis');
      transfusionGuidelines.push('Check reticulocyte count - expect recovery in 7-10 days');
    }
    if (hb < 5 && !transfusionIndicated) {
      transfusionIndicated = true;
      transfusionGuidelines.push('Severe symptomatic anemia - transfusion needed');
    }
    
    if (!transfusionIndicated) {
      transfusionGuidelines.push('Transfusion not routinely indicated');
      transfusionGuidelines.push('Simple VOC: Avoid transfusion unless Hb drops significantly');
      transfusionGuidelines.push('Target Hb should not exceed 10-11 g/dL (hyperviscosity risk)');
    }

    // Exchange transfusion calculation
    let exchangeVolume = 0;
    if (exchangeTransfusion) {
      // Blood volume estimation: 70mL/kg for adults, 80mL/kg for children
      const bloodVolume = ageYears < 18 ? 80 * weightKg : 70 * weightKg;
      exchangeVolume = Math.round(1.5 * bloodVolume); // 1.5 blood volumes
    }

    // Hydroxyurea dosing
    const hydroxyureaDosing: string[] = [];
    const initialHUDose = Math.round(15 * weightKg);
    const maxHUDose = Math.round(35 * weightKg);
    
    if (onHydroxyurea) {
      hydroxyureaDosing.push(`Current dose: ${currentHUDose || 'Unknown'} mg/day`);
      hydroxyureaDosing.push('Continue during crisis unless myelosuppression');
      hydroxyureaDosing.push('May need dose adjustment based on FBC');
    } else {
      hydroxyureaDosing.push('⚡ Hydroxyurea is disease-modifying therapy');
      hydroxyureaDosing.push(`Starting dose: ${initialHUDose} mg/day (15 mg/kg)`);
      hydroxyureaDosing.push(`Maximum dose: ${maxHUDose} mg/day (35 mg/kg)`);
      hydroxyureaDosing.push('Titrate every 8 weeks based on FBC');
      hydroxyureaDosing.push('Target: MCV >100fL, neutrophils >2.0, platelets >80');
      hydroxyureaDosing.push('Monitor FBC every 2 weeks initially, then monthly');
    }

    // Infection management
    const infectionManagement: string[] = [];
    if (hasFever) {
      infectionManagement.push('🌡️ FEVER IS AN EMERGENCY in SCD');
      infectionManagement.push('Blood cultures before antibiotics');
      infectionManagement.push('Empirical antibiotics within 1 hour:');
      infectionManagement.push('  - Ceftriaxone 2g IV (covers encapsulated organisms)');
      infectionManagement.push('  - Add Vancomycin if severely ill');
      infectionManagement.push('Malaria film if in endemic area');
      infectionManagement.push('Urinalysis and chest X-ray');
    } else {
      infectionManagement.push('No fever - low threshold to investigate if unwell');
      infectionManagement.push('Functional asplenia increases infection risk');
      infectionManagement.push('Ensure vaccinations up to date');
    }

    // ACS-specific
    const acsManagement: string[] = [];
    if (hasACS) {
      acsManagement.push('🫁 ACUTE CHEST SYNDROME PROTOCOL:');
      acsManagement.push('1. Oxygen to maintain SpO2 > 94%');
      acsManagement.push('2. Antibiotics: Ceftriaxone + Azithromycin (atypicals)');
      acsManagement.push('3. Incentive spirometry every 2 hours');
      acsManagement.push('4. Pain control (avoid over-sedation)');
      acsManagement.push('5. Bronchodilators if wheeze');
      acsManagement.push('6. Transfusion as above');
      acsManagement.push('7. ICU admission if SpO2 <90% on O2 or deteriorating');
    }

    // Monitoring
    const monitoring = [
      'Vital signs every 4 hours (every 1-2h if severe)',
      'Pain scores regularly (every 4 hours)',
      'Oxygen saturation continuous if ACS',
      'Daily FBC, reticulocytes, LDH, bilirubin',
      'U&E if dehydrated or on IV fluids',
      'Blood group and crossmatch if transfusion likely',
      'Chest X-ray if respiratory symptoms or fever',
    ];

    // Discharge criteria
    const dischargeCriteria = [
      'Pain controlled on oral analgesia',
      'Afebrile for 24 hours',
      'Adequate oral intake',
      'Stable hemoglobin',
      'No respiratory distress',
      'Social circumstances appropriate',
      'Follow-up arranged within 1-2 weeks',
    ];

    // Long-term recommendations
    const longTermRecommendations = [
      'Hydroxyurea for recurrent crises (≥3/year)',
      'Pneumococcal, meningococcal, Haemophilus vaccines',
      'Daily penicillin prophylaxis (or erythromycin if allergic)',
      'Folic acid 5mg daily',
      'Annual transcranial Doppler in children',
      'Regular ophthalmology screening',
      'Avoid dehydration, cold, hypoxia',
      'Consider chronic transfusion program if indicated',
    ];

    const calculationResult: SickleCellResult = {
      severity,
      severityFactors,
      crisisType: crisisTypes.find(c => c.value === crisisType)?.label || crisisType,
      hydrationRecommendation,
      painManagement,
      transfusionIndicated,
      exchangeTransfusion,
      exchangeVolume,
      transfusionGuidelines,
      hydroxyureaDosing,
      infectionManagement,
      acsManagement,
      monitoring,
      dischargeCriteria,
      longTermRecommendations,
      currentHb: hb,
      currentHbS: hbsPercent,
    };
    
    setResult(calculationResult);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Droplets className="w-7 h-7 text-red-600" />
        <h2 className="text-2xl font-bold text-gray-800">Sickle Cell Crisis Calculator</h2>
      </div>

      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Sickle Cell Disease Crisis Management</p>
            <p>Comprehensive crisis assessment, pain management, transfusion guidelines, and hydroxyurea dosing for sickle cell disease.</p>
          </div>
        </div>
      </div>

      {/* Basic Parameters */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Weight (kg) *</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 70"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Age (years) *</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 25"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Hb (g/dL)</label>
          <input
            type="number"
            step="0.1"
            value={hbLevel}
            onChange={(e) => setHbLevel(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 7.5"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">HbS (%)</label>
          <input
            type="number"
            value={hbS}
            onChange={(e) => setHbS(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 85"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Reticulocytes (%)</label>
          <input
            type="number"
            step="0.1"
            value={reticulocyteCount}
            onChange={(e) => setReticulocyteCount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 12"
          />
        </div>
      </div>

      {/* Crisis Type */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-3">Crisis Type</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2">
          {crisisTypes.map((crisis) => (
            <label
              key={crisis.value}
              className={`flex flex-col p-3 rounded-lg cursor-pointer border-2 transition-all ${
                crisisType === crisis.value
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="crisisType"
                checked={crisisType === crisis.value}
                onChange={() => setCrisisType(crisis.value)}
                className="sr-only"
              />
              <span className="font-medium text-sm">{crisis.label}</span>
              <span className="text-xs text-gray-500">{crisis.description}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Pain Score */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-3">
          Pain Score (0-10): <span className="text-red-600 text-xl">{painScore}</span>
        </h4>
        <input
          type="range"
          min="0"
          max="10"
          value={painScore}
          onChange={(e) => setPainScore(parseInt(e.target.value))}
          className="w-full accent-red-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>No pain</span>
          <span>Mild</span>
          <span>Moderate</span>
          <span>Severe</span>
          <span>Worst</span>
        </div>
      </div>

      {/* Complications */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-3">Complications Present</h4>
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-2">
          <label className="flex items-center gap-2 p-2 hover:bg-red-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={hasFever}
              onChange={(e) => setHasFever(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm flex items-center gap-1">
              <Thermometer className="w-4 h-4" /> Fever
            </span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-red-50 rounded cursor-pointer bg-red-100 border-red-300 border">
            <input
              type="checkbox"
              checked={hasACS}
              onChange={(e) => setHasACS(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm font-medium">⚠️ Acute Chest Syndrome</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-red-50 rounded cursor-pointer bg-red-100 border-red-300 border">
            <input
              type="checkbox"
              checked={hasStroke}
              onChange={(e) => setHasStroke(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm font-medium">🚨 Stroke/TIA</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-red-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={hasPriapism}
              onChange={(e) => setHasPriapism(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm">Priapism</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-red-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={hasSplenic}
              onChange={(e) => setHasSplenic(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm">Splenic Sequestration</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-red-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={hasAplastic}
              onChange={(e) => setHasAplastic(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm">Aplastic Crisis</span>
          </label>
        </div>
      </div>

      {/* Current Treatment */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-800 mb-3">Current Treatment</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={onHydroxyurea}
              onChange={(e) => setOnHydroxyurea(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm">Currently on Hydroxyurea</span>
            {onHydroxyurea && (
              <input
                type="text"
                value={currentHUDose}
                onChange={(e) => setCurrentHUDose(e.target.value)}
                className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm w-24 text-gray-900"
                placeholder="mg/day"
              />
            )}
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transfusion History</label>
            <select
              value={transfusionHistory}
              onChange={(e) => setTransfusionHistory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            >
              <option value="none">No regular transfusions</option>
              <option value="occasional">Occasional transfusions</option>
              <option value="chronic">Chronic transfusion program</option>
              <option value="exchange">On exchange transfusion program</option>
            </select>
          </div>
        </div>
      </div>

      <button
        onClick={calculate}
        disabled={!weight || !age}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
      >
        <Calculator className="w-5 h-5" />
        Generate Crisis Management Plan
      </button>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-4">
          <div className="border-t-2 border-gray-200 pt-6">
            {/* Severity */}
            <div className={`rounded-lg p-6 mb-4 text-center ${
              result.severity === 'Critical' ? 'bg-red-100' :
              result.severity === 'Severe' ? 'bg-orange-100' :
              result.severity === 'Moderate' ? 'bg-yellow-100' : 'bg-green-100'
            }`}>
              <p className={`text-4xl font-bold mb-2 ${
                result.severity === 'Critical' ? 'text-red-600' :
                result.severity === 'Severe' ? 'text-orange-600' :
                result.severity === 'Moderate' ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {result.severity} Crisis
              </p>
              <p className="font-semibold">{result.crisisType}</p>
              {result.severityFactors.map((factor, i) => (
                <p key={i} className="text-sm text-gray-600">{factor}</p>
              ))}
            </div>

            {/* Emergency - Exchange Transfusion */}
            {result.exchangeTransfusion && (
              <div className="bg-red-100 border-2 border-red-500 p-4 mb-4 rounded-lg">
                <h4 className="font-bold text-red-800 mb-2 text-lg">🚨 EMERGENCY EXCHANGE TRANSFUSION</h4>
                <p className="text-red-700 font-medium">
                  Estimated exchange volume: {result.exchangeVolume.toLocaleString()} mL (1.5 blood volumes)
                </p>
                <ul className="list-disc ml-6 mt-2 text-sm text-red-700">
                  {result.transfusionGuidelines.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ACS Management */}
            {result.acsManagement.length > 0 && (
              <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-purple-800 mb-2">Acute Chest Syndrome Protocol</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-purple-700">
                  {result.acsManagement.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pain Management */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-blue-800 mb-2">Pain Management</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-blue-700">
                {result.painManagement.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Hydration */}
            <div className="bg-cyan-50 border-l-4 border-cyan-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-cyan-800 mb-2 flex items-center gap-2">
                <Droplets className="w-5 h-5" />
                Fluid Management
              </h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-cyan-700">
                {result.hydrationRecommendation.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Infection */}
            {result.infectionManagement.length > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-600 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-amber-800 mb-2">Infection Management</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-amber-700">
                  {result.infectionManagement.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Transfusion */}
            {!result.exchangeTransfusion && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-red-800 mb-2">Transfusion Guidelines</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-red-700">
                  {result.transfusionGuidelines.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hydroxyurea */}
            <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-indigo-800 mb-2">Hydroxyurea (Disease-Modifying Therapy)</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-indigo-700">
                {result.hydroxyureaDosing.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Monitoring */}
            <div className="bg-gray-50 border-l-4 border-gray-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Monitoring Parameters
              </h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.monitoring.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Discharge Criteria */}
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-green-800 mb-2">Discharge Criteria</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-green-700">
                {result.dischargeCriteria.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Long-term */}
            <div className="bg-pink-50 border-l-4 border-pink-600 p-4 rounded-r-lg">
              <h4 className="font-bold text-pink-800 mb-2">Long-Term Recommendations</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-pink-700">
                {result.longTermRecommendations.map((item, index) => (
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
