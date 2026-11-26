// Sickle Cell Crisis Calculator
// Crisis Management, Hydroxyurea Dosing, Wound Healing, and Exchange Transfusion Guidelines

import { useMemo, useState } from 'react';
import { Calculator, AlertTriangle, Droplets, Activity, Thermometer, Scissors } from 'lucide-react';
import { PatientCalculatorInfo } from '../../types';
import { CRISIS_TYPES, computeSickle, sickleReport, type SickleHubResult } from '../../engine/hub/sickleCell';
import CalculatorReportActions from '../../report/components/CalculatorReportActions';

interface WoundHealingAssessment {
  hasWound: boolean;
  woundType: string;
  woundLocation: string;
  woundDuration: string;
  woundSize: string;
  currentTreatment: string;
  zincLevel: string;
  albuminLevel: string;
  nutritionStatus: string;
}

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
  
  // Wound healing assessment
  const [woundAssessment, setWoundAssessment] = useState<WoundHealingAssessment>({
    hasWound: false,
    woundType: 'leg_ulcer',
    woundLocation: 'medial_malleolus',
    woundDuration: '',
    woundSize: '',
    currentTreatment: '',
    zincLevel: '',
    albuminLevel: '',
    nutritionStatus: 'adequate',
  });
  
  const [result, setResult] = useState<SickleHubResult | null>(null);

  const crisisTypes = CRISIS_TYPES;
  const [errors, setErrors] = useState<string[]>([]);

  const calculate = () => {
    const r = computeSickle({
      weight, age, hbLevel, hbS, reticulocyteCount, crisisType, painScore,
      hasFever, hasACS, hasStroke, hasPriapism, hasSplenic, hasAplastic,
      onHydroxyurea, currentHUDose, transfusionHistory, wound: woundAssessment,
    });
    if (r.errors) { setErrors(r.errors); setResult(null); return; }
    setErrors([]);
    setResult(r.result);
  };

  const report = useMemo(() => (result ? sickleReport(result, patientInfo) : null), [result, patientInfo]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8">
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
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
          title="Pain score from 0 (no pain) to 10 (worst pain)"
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
              title="Select transfusion history"
            >
              <option value="none">No regular transfusions</option>
              <option value="occasional">Occasional transfusions</option>
              <option value="chronic">Chronic transfusion program</option>
              <option value="exchange">On exchange transfusion program</option>
            </select>
          </div>
        </div>
      </div>

      {/* Wound Healing Assessment */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Scissors className="w-4 h-4" />
          Wound Healing Assessment
        </h4>
        <label className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={woundAssessment.hasWound}
            onChange={(e) => setWoundAssessment({ ...woundAssessment, hasWound: e.target.checked })}
            className="w-4 h-4 text-red-600 rounded"
          />
          <span className="text-sm font-medium">Patient has wound/ulcer</span>
        </label>
        {woundAssessment.hasWound && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Wound Type</label>
              <select
                value={woundAssessment.woundType}
                onChange={(e) => setWoundAssessment({ ...woundAssessment, woundType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                title="Wound type"
              >
                <option value="leg_ulcer">Leg Ulcer (SCD-related)</option>
                <option value="surgical_wound">Surgical Wound</option>
                <option value="pressure_sore">Pressure Sore</option>
                <option value="traumatic">Traumatic Wound</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <select
                value={woundAssessment.woundLocation}
                onChange={(e) => setWoundAssessment({ ...woundAssessment, woundLocation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                title="Wound location"
              >
                <option value="medial_malleolus">Medial Malleolus</option>
                <option value="lateral_malleolus">Lateral Malleolus</option>
                <option value="anterior_shin">Anterior Shin</option>
                <option value="dorsum_foot">Dorsum of Foot</option>
                <option value="other_lower_limb">Other Lower Limb</option>
                <option value="upper_limb">Upper Limb</option>
                <option value="trunk">Trunk</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration (weeks)</label>
              <input
                type="number"
                value={woundAssessment.woundDuration}
                onChange={(e) => setWoundAssessment({ ...woundAssessment, woundDuration: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                placeholder="e.g., 8"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Size (cm², approx)</label>
              <input
                type="number"
                value={woundAssessment.woundSize}
                onChange={(e) => setWoundAssessment({ ...woundAssessment, woundSize: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                placeholder="e.g., 12"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Serum Albumin (g/dL)</label>
              <input
                type="number"
                step="0.1"
                value={woundAssessment.albuminLevel}
                onChange={(e) => setWoundAssessment({ ...woundAssessment, albuminLevel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                placeholder="e.g., 3.2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nutrition Status</label>
              <select
                value={woundAssessment.nutritionStatus}
                onChange={(e) => setWoundAssessment({ ...woundAssessment, nutritionStatus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                title="Nutrition status"
              >
                <option value="adequate">Adequate</option>
                <option value="at_risk">At Risk of Malnutrition</option>
                <option value="malnourished">Malnourished</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <ul className="list-disc pl-5 space-y-0.5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      <button
        onClick={calculate}
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
              {result.severityFactors?.map((factor, i) => (
                <p key={i} className="text-sm text-gray-600">{factor}</p>
              ))}
            </div>

            {/* Emergency referral */}
            {result.emergencyReferral && (result.referralReasons?.length ?? 0) > 0 && (
              <div className="bg-red-50 border-2 border-red-400 p-4 mb-4 rounded-lg">
                <h4 className="font-bold text-red-800 mb-2">Emergency referral</h4>
                <ul className="list-disc ml-6 text-sm text-red-700 space-y-0.5">
                  {result.referralReasons?.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {/* Emergency - Exchange Transfusion */}
            {result.exchangeTransfusion && (
              <div className="bg-red-100 border-2 border-red-500 p-4 mb-4 rounded-lg">
                <h4 className="font-bold text-red-800 mb-2 text-lg">EMERGENCY EXCHANGE TRANSFUSION</h4>
                <p className="text-red-700 font-medium">
                  Estimated exchange volume: {result.exchangeVolume?.toLocaleString()} mL (1.5 blood volumes)
                </p>
                <ul className="list-disc ml-6 mt-2 text-sm text-red-700">
                  {result.transfusionGuidelines?.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ACS Management */}
            {(result.acsManagement?.length ?? 0) > 0 && (
              <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-purple-800 mb-2">Acute Chest Syndrome Protocol</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-purple-700">
                  {result.acsManagement?.map((item, index) => (
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
                {result.hydrationRecommendation?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Infection */}
            {(result.infectionManagement?.length ?? 0) > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-600 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-amber-800 mb-2">Infection Management</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-amber-700">
                  {result.infectionManagement?.map((item, index) => (
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
                  {result.transfusionGuidelines?.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hydroxyurea */}
            <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-indigo-800 mb-2">Hydroxyurea (Disease-Modifying Therapy)</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-indigo-700">
                {result.hydroxyureaDosing?.map((item, index) => (
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
                {result.dischargeCriteria?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Long-term */}
            <div className="bg-pink-50 border-l-4 border-pink-600 p-4 rounded-r-lg">
              <h4 className="font-bold text-pink-800 mb-2">Long-Term Recommendations</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-pink-700">
                {result.longTermRecommendations?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Wound Healing */}
            {(result.woundHealingRecommendations?.length ?? 0) > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-700 p-4 mt-4 rounded-r-lg">
                <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                  <Scissors className="w-5 h-5" />
                  Wound Healing Protocol (SCD-Specific)
                </h4>
                <div className="space-y-1 text-sm text-amber-800">
                  {result.woundHealingRecommendations?.map((item, index) => {
                    if (item === '') return <div key={index} className="h-2" />;
                    if (item.startsWith('--')) return <p key={index} className="font-bold mt-2">{item.replace(/--/g, '').trim()}</p>;
                    if (item === 'SICKLE CELL WOUND HEALING PROTOCOL') return <p key={index} className="font-bold text-lg">{item}</p>;
                    return <p key={index} className="ml-4">• {item}</p>;
                  })}
                </div>
              </div>
            )}

            <CalculatorReportActions report={report} className="mt-6" />
          </div>
        </div>
      )}
    </div>
  );
}
