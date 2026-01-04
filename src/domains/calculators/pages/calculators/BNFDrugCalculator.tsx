// BNF Drug Calculator
// British National Formulary-Adapted Drug Dosing with Renal/Hepatic Adjustments

import { useState } from 'react';
import { Pill, Calculator, AlertTriangle, Search, Activity, Beaker } from 'lucide-react';
import { PatientCalculatorInfo, DrugDose } from '../../types';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

// Drug database with dosing information
const DRUG_DATABASE: Record<string, {
  name: string;
  class: string;
  standardDose: string;
  maxDose: string;
  route: string[];
  frequency: string;
  renalAdjustment: { gfr: number; adjustment: string }[];
  hepaticAdjustment: string;
  contraindications: string[];
  sideEffects: string[];
  interactions: string[];
  monitoring: string[];
  specialNotes: string[];
}> = {
  metronidazole: {
    name: 'Metronidazole',
    class: 'Antibiotic (Nitroimidazole)',
    standardDose: '400-500mg TDS or 7.5mg/kg TDS',
    maxDose: '4g/day',
    route: ['PO', 'IV'],
    frequency: 'Every 8 hours',
    renalAdjustment: [
      { gfr: 10, adjustment: 'Give 50% of dose or extend interval to 12 hourly' },
    ],
    hepaticAdjustment: 'Reduce dose to 1/3 of normal in severe hepatic impairment. Avoid if possible.',
    contraindications: ['Known hypersensitivity', 'First trimester pregnancy'],
    sideEffects: ['Metallic taste', 'Nausea', 'Peripheral neuropathy (prolonged use)', 'Dark urine'],
    interactions: ['Alcohol (disulfiram-like reaction)', 'Warfarin (enhanced effect)', 'Phenytoin'],
    monitoring: ['LFTs if prolonged use', 'Peripheral neuropathy symptoms'],
    specialNotes: ['Avoid alcohol during and 48h after treatment', 'Take with or after food'],
  },
  ciprofloxacin: {
    name: 'Ciprofloxacin',
    class: 'Antibiotic (Fluoroquinolone)',
    standardDose: '250-750mg BD (PO) or 200-400mg BD (IV)',
    maxDose: '1.5g/day (PO), 1.2g/day (IV)',
    route: ['PO', 'IV'],
    frequency: 'Every 12 hours',
    renalAdjustment: [
      { gfr: 30, adjustment: '250-500mg every 12 hours' },
      { gfr: 10, adjustment: '250-500mg every 18-24 hours' },
    ],
    hepaticAdjustment: 'Use with caution. No specific dose reduction but monitor LFTs.',
    contraindications: ['Tendon disorders', 'Myasthenia gravis', 'Children (except specific indications)'],
    sideEffects: ['Tendinitis/tendon rupture', 'QT prolongation', 'Photosensitivity', 'CNS effects'],
    interactions: ['Theophylline', 'NSAIDs', 'Antacids/minerals (reduce absorption)', 'Warfarin'],
    monitoring: ['Tendon pain', 'QTc if at risk', 'LFTs'],
    specialNotes: ['Take 2h before/after antacids', 'Avoid excessive sun exposure', 'Stop if tendon pain'],
  },
  ceftriaxone: {
    name: 'Ceftriaxone',
    class: 'Antibiotic (3rd Generation Cephalosporin)',
    standardDose: '1-2g daily',
    maxDose: '4g/day',
    route: ['IV', 'IM'],
    frequency: 'Once daily (or BD for severe infections)',
    renalAdjustment: [
      { gfr: 10, adjustment: 'Max 2g/day. Consider alternative if GFR <10 + hepatic impairment' },
    ],
    hepaticAdjustment: 'No adjustment needed unless combined severe renal + hepatic impairment',
    contraindications: ['Cephalosporin allergy', 'Neonates with hyperbilirubinaemia', 'With calcium-containing IV solutions in neonates'],
    sideEffects: ['Diarrhoea', 'Rash', 'Biliary sludge', 'C. difficile colitis'],
    interactions: ['Calcium-containing IV solutions (neonates)', 'Warfarin'],
    monitoring: ['Full blood count', 'LFTs for prolonged use', 'Signs of C. diff'],
    specialNotes: ['Widely used first-line empirical antibiotic', 'Good CSF penetration in meningitis'],
  },
  gentamicin: {
    name: 'Gentamicin',
    class: 'Antibiotic (Aminoglycoside)',
    standardDose: '5-7mg/kg once daily (extended interval) or 1-1.7mg/kg TDS',
    maxDose: '7mg/kg/day',
    route: ['IV', 'IM'],
    frequency: 'Once daily (preferred) or every 8 hours',
    renalAdjustment: [
      { gfr: 60, adjustment: 'Use normal dose, extend interval based on levels' },
      { gfr: 40, adjustment: 'Give every 24-36 hours, check levels' },
      { gfr: 20, adjustment: 'Give every 48 hours, check levels before each dose' },
      { gfr: 10, adjustment: 'Avoid or give every 48-72 hours with levels' },
    ],
    hepaticAdjustment: 'No adjustment needed',
    contraindications: ['Myasthenia gravis', 'Severe renal impairment (relative)'],
    sideEffects: ['Nephrotoxicity', 'Ototoxicity (vestibular and cochlear)', 'Neuromuscular blockade'],
    interactions: ['Loop diuretics (increased ototoxicity)', 'Vancomycin', 'NSAIDs', 'Ciclosporin'],
    monitoring: ['Serum levels ESSENTIAL', 'Creatinine daily', 'Vestibular/hearing assessment'],
    specialNotes: ['ALWAYS check levels: Trough <1mg/L (OD dosing), Peak 5-10mg/L', 'Maximum 7 days unless specialist advice'],
  },
  amoxicillin: {
    name: 'Amoxicillin',
    class: 'Antibiotic (Penicillin)',
    standardDose: '250-500mg TDS or 500mg-1g TDS for severe',
    maxDose: '6g/day in severe infection',
    route: ['PO', 'IV'],
    frequency: 'Every 8 hours',
    renalAdjustment: [
      { gfr: 30, adjustment: 'Max 500mg TDS' },
      { gfr: 10, adjustment: 'Max 500mg BD' },
    ],
    hepaticAdjustment: 'No adjustment needed. Monitor for cholestatic jaundice.',
    contraindications: ['Penicillin allergy'],
    sideEffects: ['Rash', 'Diarrhoea', 'Nausea', 'Allergic reactions'],
    interactions: ['Methotrexate', 'Warfarin'],
    monitoring: ['Allergic reactions', 'C. diff in prolonged use'],
    specialNotes: ['Can cause maculopapular rash in EBV infection', 'Available as suspension'],
  },
  morphine: {
    name: 'Morphine',
    class: 'Opioid Analgesic',
    standardDose: '5-10mg PO q4h or 2.5-5mg IV/SC q4h',
    maxDose: 'Titrate to effect (no ceiling for cancer pain)',
    route: ['PO', 'SC', 'IV', 'IM'],
    frequency: 'Every 4 hours (immediate release) or BD (modified release)',
    renalAdjustment: [
      { gfr: 50, adjustment: 'Reduce dose by 25%' },
      { gfr: 20, adjustment: 'Reduce dose by 50% and extend interval' },
      { gfr: 10, adjustment: 'Avoid if possible, use alternatives (fentanyl, buprenorphine)' },
    ],
    hepaticAdjustment: 'Reduce dose and extend interval. Start with 25-50% of normal dose in severe impairment.',
    contraindications: ['Acute respiratory depression', 'Paralytic ileus', 'Raised ICP', 'MAOIs'],
    sideEffects: ['Constipation', 'Nausea', 'Sedation', 'Respiratory depression', 'Pruritus'],
    interactions: ['CNS depressants', 'MAOIs (avoid)', 'Antimuscarinics'],
    monitoring: ['Respiratory rate', 'Sedation level', 'Pain scores', 'Bowel function'],
    specialNotes: ['Always prescribe laxatives prophylactically', 'Naloxone antidote for overdose'],
  },
  tramadol: {
    name: 'Tramadol',
    class: 'Opioid Analgesic',
    standardDose: '50-100mg every 4-6 hours',
    maxDose: '400mg/day (300mg if elderly)',
    route: ['PO', 'IV', 'IM'],
    frequency: 'Every 4-6 hours',
    renalAdjustment: [
      { gfr: 30, adjustment: 'Increase interval to 12 hours' },
      { gfr: 10, adjustment: 'Avoid or give 50mg every 12 hours only' },
    ],
    hepaticAdjustment: 'Reduce dose by 50% in cirrhosis. Avoid in severe impairment.',
    contraindications: ['Epilepsy (lowers seizure threshold)', 'MAOIs', 'Acute intoxication'],
    sideEffects: ['Nausea', 'Dizziness', 'Seizures', 'Serotonin syndrome'],
    interactions: ['SSRIs (serotonin syndrome)', 'MAOIs', 'Carbamazepine', 'Warfarin'],
    monitoring: ['Seizure risk', 'Serotonin syndrome symptoms'],
    specialNotes: ['Lower abuse potential than other opioids', 'Weak opioid for Step 2 WHO ladder'],
  },
  enoxaparin: {
    name: 'Enoxaparin',
    class: 'Anticoagulant (LMWH)',
    standardDose: 'Prophylaxis: 40mg SC daily. Treatment: 1mg/kg BD or 1.5mg/kg daily',
    maxDose: '1.5mg/kg once daily',
    route: ['SC'],
    frequency: 'Once daily (prophylaxis) or twice daily (treatment)',
    renalAdjustment: [
      { gfr: 30, adjustment: 'Treatment: 1mg/kg once daily instead of BD. Prophylaxis: 20-30mg daily' },
      { gfr: 15, adjustment: 'Consider unfractionated heparin instead' },
    ],
    hepaticAdjustment: 'Use with caution - increased bleeding risk',
    contraindications: ['Active bleeding', 'HIT history', 'Severe uncontrolled hypertension'],
    sideEffects: ['Bleeding', 'Injection site haematoma', 'Thrombocytopenia', 'Osteoporosis (prolonged)'],
    interactions: ['NSAIDs', 'Antiplatelets', 'Other anticoagulants'],
    monitoring: ['Platelet count (days 4-14)', 'Anti-Xa if CKD/extremes of weight', 'Bleeding signs'],
    specialNotes: ['Protamine partially reverses', 'Rotate injection sites on abdomen'],
  },
  paracetamol: {
    name: 'Paracetamol (Acetaminophen)',
    class: 'Analgesic/Antipyretic',
    standardDose: '500mg-1g every 4-6 hours',
    maxDose: '4g/day (3g/day in elderly/low weight)',
    route: ['PO', 'IV', 'PR'],
    frequency: 'Every 4-6 hours',
    renalAdjustment: [
      { gfr: 10, adjustment: 'Extend interval to every 6-8 hours' },
    ],
    hepaticAdjustment: 'Reduce dose to max 2-3g/day. Avoid in severe hepatic impairment or alcoholism.',
    contraindications: ['Severe hepatic impairment', 'Known hypersensitivity'],
    sideEffects: ['Hepatotoxicity (overdose)', 'Rare allergic reactions'],
    interactions: ['Warfarin (prolonged use may increase INR)', 'Alcohol'],
    monitoring: ['LFTs if prolonged use or liver disease'],
    specialNotes: ['First-line analgesic (WHO Step 1)', 'Overdose: N-acetylcysteine antidote'],
  },
  ibuprofen: {
    name: 'Ibuprofen',
    class: 'NSAID',
    standardDose: '200-400mg TDS',
    maxDose: '2.4g/day (1.2g/day for OTC)',
    route: ['PO'],
    frequency: 'Every 6-8 hours',
    renalAdjustment: [
      { gfr: 30, adjustment: 'Use lowest effective dose for shortest duration' },
      { gfr: 15, adjustment: 'AVOID - risk of acute kidney injury' },
    ],
    hepaticAdjustment: 'Use with caution. Avoid in severe impairment.',
    contraindications: ['Active GI bleeding/ulcer', 'Severe heart failure', 'Severe CKD', 'Third trimester pregnancy'],
    sideEffects: ['GI upset/bleeding', 'Renal impairment', 'Cardiovascular events', 'Fluid retention'],
    interactions: ['Anticoagulants', 'ACE inhibitors/ARBs', 'Methotrexate', 'Lithium', 'SSRIs'],
    monitoring: ['Renal function', 'Blood pressure', 'GI symptoms'],
    specialNotes: ['Take with food', 'Avoid in dehydration', 'Shortest duration at lowest dose'],
  },
};

export default function BNFDrugCalculator({ patientInfo }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDrug, setSelectedDrug] = useState<string | null>(null);
  const [gfr, setGfr] = useState('');
  const [hasHepaticImpairment, setHasHepaticImpairment] = useState(false);
  const [weight, setWeight] = useState(patientInfo.weight || '');
  
  const [result, setResult] = useState<DrugDose | null>(null);

  const filteredDrugs = Object.entries(DRUG_DATABASE).filter(([key, drug]) =>
    drug.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    drug.class.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateDose = () => {
    if (!selectedDrug) return;
    
    const drug = DRUG_DATABASE[selectedDrug];
    const gfrValue = parseFloat(gfr) || 100;
    const weightKg = parseFloat(weight) || 70;
    
    // Find applicable renal adjustment
    let renalAdjustmentNote = 'No adjustment needed';
    let isRenalAdjusted = false;
    
    for (const adj of drug.renalAdjustment) {
      if (gfrValue <= adj.gfr) {
        renalAdjustmentNote = adj.adjustment;
        isRenalAdjusted = true;
        break;
      }
    }
    
    // Weight-based calculation for certain drugs
    let weightBasedDose = '';
    if (selectedDrug === 'gentamicin') {
      const onceDailyDose = Math.round(5 * weightKg);
      weightBasedDose = `Extended-interval: ${onceDailyDose}mg IV once daily (5mg/kg)`;
    } else if (selectedDrug === 'enoxaparin' && gfrValue >= 30) {
      const treatmentDose = Math.round(weightKg);
      weightBasedDose = `Treatment dose: ${treatmentDose}mg SC every 12 hours (1mg/kg)`;
    }

    const calculationResult: DrugDose = {
      drugName: drug.name,
      drugClass: drug.class,
      standardDose: drug.standardDose,
      adjustedDose: isRenalAdjusted || hasHepaticImpairment ? 'See adjustments below' : drug.standardDose,
      maxDose: drug.maxDose,
      route: drug.route.join(' / '),
      frequency: drug.frequency,
      renalAdjustment: renalAdjustmentNote,
      hepaticAdjustment: drug.hepaticAdjustment,
      isRenalAdjusted,
      isHepaticAdjusted: hasHepaticImpairment,
      gfrUsed: gfrValue,
      weightBasedDose,
      contraindications: drug.contraindications,
      sideEffects: drug.sideEffects,
      interactions: drug.interactions,
      monitoring: drug.monitoring,
      specialNotes: drug.specialNotes,
    };
    
    setResult(calculationResult);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Pill className="w-5 h-5 sm:w-7 sm:h-7 text-blue-600" />
        <h2 className="text-lg sm:text-2xl font-bold text-gray-800">BNF Drug Calculator</h2>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4 mb-4 sm:mb-6 rounded-r-lg">
        <div className="flex items-start gap-2 sm:gap-3">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs sm:text-sm text-gray-700">
            <p className="font-semibold mb-1">Drug Dosing with Renal & Hepatic Adjustments</p>
            <p className="hidden sm:block">BNF-adapted dosing guidelines for common medications. Always verify with current formulary and clinical judgement.</p>
          </div>
        </div>
      </div>

      {/* Drug Search */}
      <div className="mb-4 sm:mb-6">
        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
          Search Drug *
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
            placeholder="Search drug..."
          />
        </div>
        
        {/* Drug List */}
        {searchTerm && (
          <div className="mt-2 border border-gray-200 rounded-lg max-h-40 sm:max-h-48 overflow-y-auto">
            {filteredDrugs.map(([key, drug]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedDrug(key);
                  setSearchTerm(drug.name);
                }}
                className={`w-full text-left px-3 sm:px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0 ${
                  selectedDrug === key ? 'bg-blue-100' : ''
                }`}
              >
                <span className="font-medium text-sm">{drug.name}</span>
                <span className="text-xs text-gray-500 ml-2">({drug.class})</span>
              </button>
            ))}
            {filteredDrugs.length === 0 && (
              <p className="px-4 py-2 text-gray-500 text-xs sm:text-sm">No drugs found</p>
            )}
          </div>
        )}
      </div>

      {/* Patient Parameters */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
            <Beaker className="inline w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            GFR
          </label>
          <input
            type="number"
            value={gfr}
            onChange={(e) => setGfr(e.target.value)}
            className="w-full px-2 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
            placeholder="45"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Weight (kg)
          </label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 70"
          />
        </div>
        <div className="flex items-center">
          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer w-full">
            <input
              type="checkbox"
              checked={hasHepaticImpairment}
              onChange={(e) => setHasHepaticImpairment(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <div>
              <Activity className="inline w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Hepatic Impairment</span>
            </div>
          </label>
        </div>
      </div>

      <button
        onClick={calculateDose}
        disabled={!selectedDrug}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
      >
        <Calculator className="w-5 h-5" />
        Calculate Adjusted Dose
      </button>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-4">
          <div className="border-t-2 border-gray-200 pt-6">
            {/* Drug Header */}
            <div className="bg-blue-100 rounded-lg p-4 mb-4">
              <h3 className="text-xl font-bold text-blue-800">{result.drugName}</h3>
              <p className="text-sm text-blue-600">{result.drugClass}</p>
            </div>

            {/* Dosing */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Standard Dose</h4>
                <p className="text-lg font-medium">{result.standardDose}</p>
                <p className="text-sm text-gray-600">Max: {result.maxDose}</p>
                <p className="text-sm text-gray-600">Route: {result.route}</p>
                <p className="text-sm text-gray-600">Frequency: {result.frequency}</p>
              </div>
              
              {result.weightBasedDose && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Weight-Based Dose</h4>
                  <p className="text-lg font-medium text-green-700">{result.weightBasedDose}</p>
                  <p className="text-sm text-gray-600">Patient weight: {weight}kg</p>
                </div>
              )}
            </div>

            {/* Adjustments */}
            {(result.isRenalAdjusted || result.isHepaticAdjusted) && (
              <div className="space-y-3 mb-4">
                {result.isRenalAdjusted && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                    <h4 className="font-bold text-amber-800 mb-1 flex items-center gap-2">
                      <Kidney className="w-5 h-5" />
                      Renal Adjustment Required (GFR: {result.gfrUsed})
                    </h4>
                    <p className="text-amber-700">{result.renalAdjustment}</p>
                  </div>
                )}
                
                {result.isHepaticAdjusted && (
                  <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                    <h4 className="font-bold text-orange-800 mb-1 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Hepatic Adjustment
                    </h4>
                    <p className="text-orange-700">{result.hepaticAdjustment}</p>
                  </div>
                )}
              </div>
            )}

            {/* Contraindications */}
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-red-800 mb-2">⚠️ Contraindications</h4>
              <ul className="list-disc ml-6 text-sm text-red-700">
                {result.contraindications.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Side Effects & Interactions */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                <h4 className="font-bold text-purple-800 mb-2">Side Effects</h4>
                <ul className="list-disc ml-6 text-sm text-purple-700">
                  {result.sideEffects.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-pink-50 border-l-4 border-pink-500 p-4 rounded-r-lg">
                <h4 className="font-bold text-pink-800 mb-2">Drug Interactions</h4>
                <ul className="list-disc ml-6 text-sm text-pink-700">
                  {result.interactions.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Monitoring */}
            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-indigo-800 mb-2">Monitoring Required</h4>
              <ul className="list-disc ml-6 text-sm text-indigo-700">
                {result.monitoring.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Special Notes */}
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
              <h4 className="font-bold text-green-800 mb-2">Clinical Notes</h4>
              <ul className="list-disc ml-6 text-sm text-green-700">
                {result.specialNotes.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Available Drugs Reference */}
      <div className="mt-8 border-t pt-4">
        <h4 className="font-semibold text-gray-700 mb-2">Available Drugs in Database:</h4>
        <div className="flex flex-wrap gap-2">
          {Object.values(DRUG_DATABASE).map((drug, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600 cursor-pointer hover:bg-blue-100"
              onClick={() => {
                setSelectedDrug(Object.keys(DRUG_DATABASE)[index]);
                setSearchTerm(drug.name);
              }}
            >
              {drug.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
