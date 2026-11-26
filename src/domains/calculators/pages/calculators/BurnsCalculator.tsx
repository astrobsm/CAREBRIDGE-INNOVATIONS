// Burns Calculator
// TBSA, Parkland Formula, ABSI Score, and WHO-Adapted Burns Management

import { useMemo, useState } from 'react';
import { Flame, Calculator, AlertTriangle, Droplets, Activity } from 'lucide-react';
import { PatientCalculatorInfo, BurnsResult } from '../../types';
import { toSex } from '../../engine/calculationEngine';
import {
  ADULT_RULE_OF_NINES, CHILD_RULE_OF_NINES, EMPTY_BODY_PARTS, burnsReport, clampBodyParts, computeBurns,
  isChildAge, tbsaOf, type BodyParts, type BurnsExtras,
} from '../../engine/hub/burns';
import CalculatorReportActions from '../../report/components/CalculatorReportActions';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function BurnsCalculator({ patientInfo }: Props) {
  const [weight, setWeight] = useState(patientInfo.weight || '');
  const [age, setAge] = useState(patientInfo.age || '');
  // The paediatric chart follows the age, including a prefilled one.
  const [isChild, setIsChild] = useState(() => isChildAge(patientInfo.age));
  const [timeSinceBurn, setTimeSinceBurn] = useState('');
  
  // Body part burn percentages
  const [bodyParts, setBodyParts] = useState<BodyParts>(EMPTY_BODY_PARTS);
  
  // Burn depth
  const [burnDepth, setBurnDepth] = useState<'superficial' | 'partial' | 'full'>('partial');
  
  // ABSI factors
  const [inhalationInjury, setInhalationInjury] = useState(false);
  // elderly-male / elderly-female fold to male / female (they used to fall
  // through as an unmatched option, and elderly men were scored as female).
  const [gender, setGender] = useState<'male' | 'female'>(toSex(patientInfo.gender));
  
  const [result, setResult] = useState<BurnsResult | null>(null);
  const [extras, setExtras] = useState<BurnsExtras | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [reportInputs, setReportInputs] = useState<Parameters<typeof burnsReport>[2] | null>(null);
  const report = useMemo(
    () => (result && extras && reportInputs ? burnsReport(result, extras, reportInputs, patientInfo) : null),
    [result, extras, reportInputs, patientInfo]
  );

  const ruleOfNines = isChild ? CHILD_RULE_OF_NINES : ADULT_RULE_OF_NINES;

  const handleBodyPartChange = (part: keyof typeof bodyParts, value: number) => {
    const maxPercentage = ruleOfNines[part].percentage;
    setBodyParts(prev => ({
      ...prev,
      [part]: Math.min(value, maxPercentage),
    }));
  };

  const calculateTBSA = () => tbsaOf(bodyParts);

  const changeAge = (value: string) => {
    setAge(value);
    const child = isChildAge(value);
    setIsChild(child);
    // Switching chart re-clamps every region to the new chart's maximum.
    setBodyParts(prev => clampBodyParts(prev, child));
  };

  const calculate = () => {
    const r = computeBurns({
      weight, age, isChild, timeSinceBurn, bodyParts, burnDepth, inhalationInjury, gender,
    });
    if ('errors' in r) { setErrors(r.errors); setResult(null); setExtras(null); return; }
    setErrors([]);
    setResult(r.result);
    setExtras(r.extras);
    setReportInputs({
      weightKg: Number(weight), ageYears: Number(age), timeSinceBurn: Number(timeSinceBurn) || 0,
      bodyParts: clampBodyParts(bodyParts, isChild), isChild, gender,
    });
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
            onChange={(e) => changeAge(e.target.value)}
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
            title="Select gender"
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
                  title={`Burn percentage for ${name}`}
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
              <p className="text-sm text-red-800 font-semibold">CRITICAL WARNING:</p>
              <ul className="text-sm text-red-700 list-disc ml-4 mt-1">
                <li>Secure airway IMMEDIATELY - early intubation recommended</li>
                <li>High-flow oxygen therapy</li>
                <li>Prepare for emergency tracheostomy</li>
                <li>Expect higher fluid needs than calculated — titrate up on urine output (the volumes shown are not pre-increased)</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={calculate}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
      >
        <Calculator className="w-5 h-5" />
        Calculate Burns Management Plan
      </button>

      {errors.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

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
                <p className="text-sm">{result.absiSurvival}</p>
                <p className="text-sm font-medium mt-1">Revised Baux: {extras?.revisedBaux ?? '—'}</p>
                <p className="text-xs text-red-700 mt-1">Check: {extras?.absiCaveat}</p>
              </div>

              {/* Fluid Requirement */}
              <div className="bg-blue-100 rounded-lg p-4 text-center">
                <Droplets className="w-6 h-6 mx-auto text-blue-600 mb-1" />
                <p className="text-2xl font-bold">
                  {result.parklandFluid?.totalFluid24h?.toLocaleString() ?? '—'}–{result.parklandFluid?.parklandUpperBound24h?.toLocaleString() ?? '—'} mL
                </p>
                <p className="font-semibold text-sm">24-h Fluid Range (ABA → Parkland)</p>
                <p className="text-xs text-gray-600">Lactated Ringer’s — titrate to UO</p>
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
                  <p>{result.parklandFluid?.first8Hours?.toLocaleString() ?? '—'} mL total</p>
                  <p className="text-blue-700 font-medium">
                    Rate: {result.parklandFluid?.hourlyFirst8 ?? '—'} mL/hour
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Next 16 hours:</p>
                  <p>{result.parklandFluid?.next16Hours?.toLocaleString() ?? '—'} mL total</p>
                  <p className="text-blue-700 font-medium">
                    Rate: {result.parklandFluid?.hourlyNext16 ?? '—'} mL/hour
                  </p>
                </div>
              </div>
              {result.fluidAdjustment && (
                <p className="mt-2 text-sm bg-yellow-100 p-2 rounded">
                  TIME ADJUSTMENT: {result.fluidAdjustment}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-700">
                <strong>Starting dose shown is ABA-recommended 2 mL/kg/%TBSA</strong> (ISBI 2016, ABA 2016) to mitigate “fluid creep”. Classic Parkland upper bound is {result.parklandFluid?.parklandUpperBound24h?.toLocaleString() ?? '—'} mL/24 h. Titrate hourly rate to maintain urine output 0.5–1 mL/kg/h (adults) or 1–2 mL/kg/h (children &lt;30 kg). For high-voltage electrical injury or rhabdomyolysis: target UO 1–1.5 mL/kg/h.
              </p>
            </div>

            {/* Referral Criteria */}
            {(result.referralCriteria?.length ?? 0) > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-red-800 mb-2">WARNING - Burns Centre Referral Criteria Met:</h4>
                <ul className="list-disc ml-6 text-sm text-red-700">
                  {result.referralCriteria?.map((criteria, index) => (
                    <li key={index}>{criteria}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Wound Care */}
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-green-800 mb-2">Wound Care Protocol:</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.woundCare?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Pain Management */}
            <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-purple-800 mb-2">Pain Management:</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.painManagement?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Nutrition */}
            <div className="bg-amber-50 border-l-4 border-amber-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-amber-800 mb-2">Nutritional Requirements:</h4>
              <div className="text-sm text-gray-700">
                <p><strong>Daily Caloric Needs:</strong> {result.nutritionNeeds?.calories?.toLocaleString() ?? '—'} kcal/day</p>
                <p><strong>Daily Protein Needs:</strong> {result.nutritionNeeds?.protein ?? '—'} g/day</p>
                <p className="mt-2 text-xs">
                  {extras?.nutritionFormula}; protein from the nutrition engine's burns range (low end). The same figures as the Bedside Burns tab.
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
                {result.monitoring?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <CalculatorReportActions report={report} />
        </div>
      )}
    </div>
  );
}
