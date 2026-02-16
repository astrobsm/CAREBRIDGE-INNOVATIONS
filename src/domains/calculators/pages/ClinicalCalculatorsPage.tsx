// Clinical Calculators Hub Page
// WHO-Aligned Critical Care Management Tools

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  Droplet,
  Zap,
  FlaskConical,
  Activity,
  Pill,
  Flame,
  UtensilsCrossed,
  Heart,
  Bed,
  Apple,
  Soup,
  TrendingDown,
  TrendingUp,
  CircleDot,
  User,
  X,
  ChevronRight,
  Search,
  UserCheck,
} from 'lucide-react';
import { differenceInYears } from 'date-fns';
import { db } from '../../../database';
import type { Patient } from '../../../types';
import { HospitalSelector } from '../../../components/hospital';
import { PatientCalculatorInfo, COMMON_COMORBIDITIES } from '../types';
import SodiumCalculator from './calculators/SodiumCalculator';
import PotassiumCalculator from './calculators/PotassiumCalculator';
import AcidBaseCalculator from './calculators/AcidBaseCalculator';
import GFRCalculator from './calculators/GFRCalculator';
import BNFDrugCalculator from './calculators/BNFDrugCalculator';
import BurnsCalculator from './calculators/BurnsCalculator';
import NutritionCalculator from './calculators/NutritionCalculator';
import DVTRiskCalculator from './calculators/DVTRiskCalculator';
import BradenScaleCalculator from './calculators/BradenScaleCalculator';
import MUSTCalculator from './calculators/MUSTCalculator';
import WoundMealPlanCalculator from './calculators/WoundMealPlanCalculator';
import WeightLossCalculator from './calculators/WeightLossCalculator';
import WeightGainCalculator from './calculators/WeightGainCalculator';
import SickleCellCalculator from './calculators/SickleCellCalculator';

type CalculatorTab = 
  | 'sodium' 
  | 'potassium' 
  | 'acidbase' 
  | 'gfr' 
  | 'bnf' 
  | 'burns' 
  | 'nutrition' 
  | 'dvt' 
  | 'pressuresore' 
  | 'must' 
  | 'woundmealplan' 
  | 'weightloss' 
  | 'weightgain' 
  | 'sicklecell';

interface CalculatorTabConfig {
  id: CalculatorTab;
  label: string;
  icon: typeof Calculator;
  description: string;
  category: 'electrolytes' | 'renal' | 'drugs' | 'wounds' | 'nutrition' | 'risk' | 'hematology';
}

const calculatorTabs: CalculatorTabConfig[] = [
  // Electrolytes & Fluids
  { id: 'sodium', label: 'Sodium', icon: Droplet, description: 'Hypo/Hypernatremia management', category: 'electrolytes' },
  { id: 'potassium', label: 'Potassium', icon: Zap, description: 'Hypo/Hyperkalemia management', category: 'electrolytes' },
  { id: 'acidbase', label: 'Acid-Base', icon: FlaskConical, description: 'ABG interpretation', category: 'electrolytes' },
  
  // Renal
  { id: 'gfr', label: 'GFR', icon: Activity, description: 'Kidney function & CKD staging', category: 'renal' },
  
  // Drugs
  { id: 'bnf', label: 'BNF Drugs', icon: Pill, description: 'Drug dosing calculator', category: 'drugs' },
  
  // Wounds & Burns
  { id: 'burns', label: 'Burns', icon: Flame, description: 'TBSA, Parkland & ABSI', category: 'wounds' },
  { id: 'pressuresore', label: 'Pressure Sore', icon: Bed, description: 'Braden Scale assessment', category: 'wounds' },
  { id: 'woundmealplan', label: 'Wound Healing', icon: Soup, description: 'Nutritional support for wounds', category: 'wounds' },
  
  // Nutrition
  { id: 'nutrition', label: 'Nutrition', icon: UtensilsCrossed, description: 'Caloric & protein requirements', category: 'nutrition' },
  { id: 'must', label: 'MUST Score', icon: Apple, description: 'Malnutrition screening', category: 'nutrition' },
  { id: 'weightloss', label: 'Weight Loss', icon: TrendingDown, description: 'Weight reduction planning', category: 'nutrition' },
  { id: 'weightgain', label: 'Weight Gain', icon: TrendingUp, description: 'Weight gain planning', category: 'nutrition' },
  
  // Risk Assessment
  { id: 'dvt', label: 'DVT Risk', icon: Heart, description: 'Caprini VTE scoring', category: 'risk' },
  
  // Hematology
  { id: 'sicklecell', label: 'Sickle Cell', icon: CircleDot, description: 'Crisis management', category: 'hematology' },
];

const categoryLabels = {
  electrolytes: 'Electrolytes & Fluids',
  renal: 'Renal Function',
  drugs: 'Drug Dosing',
  wounds: 'Wounds & Burns',
  nutrition: 'Nutrition',
  risk: 'Risk Assessment',
  hematology: 'Hematology',
};

export default function ClinicalCalculatorsPage() {
  const [activeTab, setActiveTab] = useState<CalculatorTab>('sodium');
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [patientInfo, setPatientInfo] = useState<PatientCalculatorInfo>({
    name: '',
    age: '',
    gender: 'male',
    weight: '',
    height: '',
    hospital: '',
    hospitalNumber: '',
    diagnosis: '',
    comorbidities: [],
  });

  // Patient search/autofill state
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Debounced patient search
  const searchPatients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPatientSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    try {
      const lowerQuery = query.toLowerCase();
      const results = await db.patients
        .filter((p: Patient) => {
          const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
          const hospitalNum = (p.hospitalNumber || '').toLowerCase();
          return fullName.includes(lowerQuery) || hospitalNum.includes(lowerQuery);
        })
        .limit(10)
        .toArray();
      setPatientSearchResults(results);
      setShowSearchResults(results.length > 0);
    } catch {
      setPatientSearchResults([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchPatients(patientSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearchQuery, searchPatients]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autofill patient info from DB patient
  const autofillFromPatient = (patient: Patient) => {
    const age = patient.dateOfBirth
      ? differenceInYears(new Date(), new Date(patient.dateOfBirth))
      : 0;
    const isElderly = age >= 65;
    let gender: PatientCalculatorInfo['gender'] = patient.gender === 'female' ? 'female' : 'male';
    if (isElderly) {
      gender = patient.gender === 'female' ? 'elderly-female' : 'elderly-male';
    }

    // Map chronic conditions to comorbidities
    const matchedComorbidities = (patient.chronicConditions || []).filter(c =>
      COMMON_COMORBIDITIES.some(cc => cc.toLowerCase() === c.toLowerCase())
    );

    setPatientInfo({
      name: `${patient.firstName} ${patient.lastName}`.trim(),
      age: age > 0 ? String(age) : '',
      gender,
      weight: '',
      height: '',
      hospital: patient.hospitalName || '',
      hospitalNumber: patient.hospitalNumber || '',
      diagnosis: '',
      comorbidities: matchedComorbidities,
    });
    setSelectedPatientId(patient.id);
    setPatientSearchQuery('');
    setShowSearchResults(false);
  };
  const toggleComorbidity = (comorbidity: string) => {
    setPatientInfo(prev => ({
      ...prev,
      comorbidities: prev.comorbidities.includes(comorbidity)
        ? prev.comorbidities.filter(c => c !== comorbidity)
        : [...prev.comorbidities, comorbidity]
    }));
  };

  const activeTabConfig = calculatorTabs.find(t => t.id === activeTab);

  const renderCalculator = () => {
    switch (activeTab) {
      case 'sodium':
        return <SodiumCalculator patientInfo={patientInfo} />;
      case 'potassium':
        return <PotassiumCalculator patientInfo={patientInfo} />;
      case 'acidbase':
        return <AcidBaseCalculator patientInfo={patientInfo} />;
      case 'gfr':
        return <GFRCalculator patientInfo={patientInfo} />;
      case 'bnf':
        return <BNFDrugCalculator patientInfo={patientInfo} />;
      case 'burns':
        return <BurnsCalculator patientInfo={patientInfo} />;
      case 'nutrition':
        return <NutritionCalculator patientInfo={patientInfo} />;
      case 'dvt':
        return <DVTRiskCalculator patientInfo={patientInfo} />;
      case 'pressuresore':
        return <BradenScaleCalculator patientInfo={patientInfo} />;
      case 'must':
        return <MUSTCalculator patientInfo={patientInfo} />;
      case 'woundmealplan':
        return <WoundMealPlanCalculator patientInfo={patientInfo} />;
      case 'weightloss':
        return <WeightLossCalculator patientInfo={patientInfo} />;
      case 'weightgain':
        return <WeightGainCalculator patientInfo={patientInfo} />;
      case 'sicklecell':
        return <SickleCellCalculator patientInfo={patientInfo} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg print:hidden">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Calculator className="w-8 h-8 sm:w-10 sm:h-10" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Clinical Calculators</h1>
              <p className="text-xs sm:text-sm text-sky-100">WHO-Aligned Critical Care Management</p>
            </div>
          </div>
        </div>
      </header>

      {/* Patient Information Banner */}
      {patientInfo.name && (
        <div className="bg-gradient-to-r from-blue-100 to-blue-50 border-b-2 border-blue-300 print:hidden">
          <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
                <div><strong>Patient:</strong> {patientInfo.name}</div>
                {patientInfo.hospital && <div><strong>Hospital:</strong> {patientInfo.hospital}</div>}
                <div><strong>Age:</strong> {patientInfo.age} years</div>
                <div><strong>Gender:</strong> {patientInfo.gender === 'male' ? 'Male' : 'Female'}</div>
                {patientInfo.hospitalNumber && <div><strong>Hospital #:</strong> {patientInfo.hospitalNumber}</div>}
                {patientInfo.diagnosis && <div><strong>Dx:</strong> {patientInfo.diagnosis}</div>}
              </div>
              <button
                onClick={() => setShowPatientForm(true)}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Edit
              </button>
            </div>
            {patientInfo.comorbidities.length > 0 && (
              <div className="mt-2 text-xs">
                <strong>Comorbidities:</strong> {patientInfo.comorbidities.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <nav className="bg-white shadow-md sticky top-0 z-10 print:hidden">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex overflow-x-auto scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0">
            <button
              onClick={() => setShowPatientForm(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 sm:py-4 font-semibold text-blue-600 hover:bg-blue-50 transition-all whitespace-nowrap border-r border-gray-200 text-sm sm:text-base"
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Patient</span> Info
            </button>
            {calculatorTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 sm:py-4 font-medium transition-all whitespace-nowrap text-xs sm:text-sm ${
                    activeTab === tab.id
                      ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50'
                      : 'text-gray-600 hover:text-sky-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Patient Information Form Modal */}
      <AnimatePresence>
        {showPatientForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="flex-shrink-0 bg-gradient-to-r from-sky-600 to-indigo-600 text-white p-4 sm:p-6 rounded-t-2xl sm:rounded-t-xl flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold">Patient Information</h2>
                  <p className="text-xs sm:text-sm text-sky-100 mt-1">Enter details for all calculators</p>
                </div>
                <button
                  onClick={() => setShowPatientForm(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Patient Search / Autofill */}
                <div className="relative" ref={searchDropdownRef}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Search className="w-4 h-4 inline mr-1" />
                    Search Patient from Database
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={patientSearchQuery}
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                      onFocus={() => patientSearchResults.length > 0 && setShowSearchResults(true)}
                      className="w-full px-4 py-2 pl-10 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                      placeholder="Type patient name or hospital number to search..."
                    />
                    <Search className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {selectedPatientId && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                      <UserCheck className="w-3 h-3" />
                      Patient loaded from database
                    </div>
                  )}
                  {showSearchResults && patientSearchResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {patientSearchResults.map((p) => {
                        const age = p.dateOfBirth
                          ? differenceInYears(new Date(), new Date(p.dateOfBirth))
                          : null;
                        return (
                          <button
                            key={p.id}
                            onClick={() => autofillFromPatient(p)}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className="font-medium text-gray-900">
                              {p.firstName} {p.lastName}
                            </div>
                            <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                              {p.hospitalNumber && <span>#{p.hospitalNumber}</span>}
                              {age !== null && <span>{age}yrs</span>}
                              <span className="capitalize">{p.gender}</span>
                              {p.hospitalName && <span>{p.hospitalName}</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <p className="text-xs text-gray-500 mb-3">Or enter patient details manually:</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Patient Name *
                    </label>
                    <input
                      type="text"
                      value={patientInfo.name}
                      onChange={(e) => setPatientInfo({...patientInfo, name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      placeholder="Full Name"
                    />
                  </div>
                  <div>
                    <HospitalSelector
                      value={patientInfo.hospital}
                      onChange={(hospitalId, hospital) => setPatientInfo({
                        ...patientInfo,
                        hospital: hospital?.name || hospitalId || ''
                      })}
                      label="Hospital"
                      placeholder="Search or select hospital..."
                      showAddNew={true}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Hospital Number
                    </label>
                    <input
                      type="text"
                      value={patientInfo.hospitalNumber}
                      onChange={(e) => setPatientInfo({...patientInfo, hospitalNumber: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      placeholder="e.g., MRN123456"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Age (years) *
                    </label>
                    <input
                      type="number"
                      value={patientInfo.age}
                      onChange={(e) => setPatientInfo({...patientInfo, age: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      placeholder="Age"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Gender *
                    </label>
                    <select
                      value={patientInfo.gender}
                      onChange={(e) => setPatientInfo({...patientInfo, gender: e.target.value as PatientCalculatorInfo['gender']})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      title="Select gender"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="elderly-male">Elderly Male (65+)</option>
                      <option value="elderly-female">Elderly Female (65+)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={patientInfo.weight}
                      onChange={(e) => setPatientInfo({...patientInfo, weight: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      placeholder="Weight in kg"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      value={patientInfo.height}
                      onChange={(e) => setPatientInfo({...patientInfo, height: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      placeholder="Height in cm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Diagnosis
                  </label>
                  <input
                    type="text"
                    value={patientInfo.diagnosis}
                    onChange={(e) => setPatientInfo({...patientInfo, diagnosis: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    placeholder="Primary diagnosis"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Comorbidities
                    <span className="text-xs text-gray-500 ml-2">(Select all that apply)</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 sm:p-3">
                    {COMMON_COMORBIDITIES.map((comorbidity) => (
                      <label key={comorbidity} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={patientInfo.comorbidities.includes(comorbidity)}
                          onChange={() => toggleComorbidity(comorbidity)}
                          className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm text-gray-700">{comorbidity}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 rounded-b-2xl sm:rounded-b-xl flex gap-2 sm:gap-3 border-t">
                <button
                  onClick={() => setShowPatientForm(false)}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-2 bg-sky-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-sky-700 transition-colors"
                >
                  Save & Continue
                </button>
                <button
                  onClick={() => setShowPatientForm(false)}
                  className="px-4 sm:px-6 py-2.5 sm:py-2 border border-gray-300 text-gray-700 text-sm sm:text-base font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calculator Content */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Active Calculator Info */}
          {activeTabConfig && (
            <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-1.5 sm:gap-3 text-gray-600">
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm">{categoryLabels[activeTabConfig.category]}</span>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium text-gray-900 text-sm sm:text-base">{activeTabConfig.label}</span>
              <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">- {activeTabConfig.description}</span>
            </div>
          )}
          
          {renderCalculator()}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-4 sm:py-6 mt-8 sm:mt-16 print:hidden">
        <div className="container mx-auto px-3 sm:px-4 text-center">
          <p className="text-lg font-semibold text-sky-400 mb-3">
            ASTROHEALTH INNOVATIONS
          </p>
          <p className="text-sm italic text-gray-300 mb-4">
            Interactive Surgical EMR & Patient Management
          </p>
          <p className="text-sm text-gray-400">
            Clinical Critical Calculator - For healthcare professionals only
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Based on WHO guidelines and standard ICU protocols. Always verify calculations and use clinical judgment.
          </p>
        </div>
      </footer>
    </div>
  );
}
