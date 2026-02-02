import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { syncRecord } from '../../../services/cloudSyncService';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { subDays, isWithinInterval } from 'date-fns';
import { differenceInYears } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Scissors,
  ClipboardCheck,
  AlertTriangle,
  Users,
  CheckCircle,
  Info,
  Search,
  FileText,
  Download,
  DollarSign,
  Beaker,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import type { Surgery, PreOperativeAssessment, AnaesthesiaType, OutstandingPreparationItem, Investigation } from '../../../types';
import {
  surgicalProcedures,
  procedureCategories,
  formatNaira,
  calculateSurgicalFeeEstimate,
  complexityLevels,
  type SurgicalProcedure,
  type SurgicalFeeEstimate,
} from '../../../data/surgicalFees';
import {
  generatePreOpInstructionsPDF,
  generatePostOpInstructionsPDF,
  generateFeeEstimatePDF,
  generateConsentFormPDF,
} from '../utils/surgeryPdfGenerator';
import { generatePatientCounselingPDF } from '../../../utils/counselingPdfGenerator';
import { getProcedureEducation } from '../../../data/patientEducation';

const surgerySchema = z.object({
  procedureName: z.string().min(3, 'Procedure name is required'),
  procedureCode: z.string().optional(),
  procedureId: z.string().optional(),
  type: z.enum(['elective', 'emergency']),
  category: z.enum(['minor', 'intermediate', 'major', 'super_major']),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  asaScore: z.number().min(1).max(5),
  capriniScore: z.number().optional(),
  mallampatiScore: z.number().min(1).max(4).optional(),
  npoStatus: z.boolean(),
  consentSigned: z.boolean(),
  bloodTyped: z.boolean(),
  investigations: z.string().optional(),
  riskFactors: z.array(z.string()).optional(),
  specialInstructions: z.string().optional(),
  anaesthesiaType: z.string().optional(),
  assistant: z.string().optional(),
  anaesthetist: z.string().optional(),
  scrubNurse: z.string().optional(),
  circulatingNurse: z.string().optional(),
  surgeonFee: z.number().optional(),
  includeHistology: z.boolean().optional(),
});

type SurgeryFormData = z.infer<typeof surgerySchema>;

const asaDescriptions = [
  { score: 1, description: 'Normal healthy patient' },
  { score: 2, description: 'Patient with mild systemic disease' },
  { score: 3, description: 'Patient with severe systemic disease' },
  { score: 4, description: 'Patient with severe systemic disease that is a constant threat to life' },
  { score: 5, description: 'Moribund patient not expected to survive without the operation' },
];

const capriniRiskLevels = [
  { range: [0, 0], level: 'Very Low', color: 'bg-emerald-100 text-emerald-700', prophylaxis: 'Early ambulation only' },
  { range: [1, 2], level: 'Low', color: 'bg-sky-100 text-sky-700', prophylaxis: 'Mechanical prophylaxis (IPC/GCS)' },
  { range: [3, 4], level: 'Moderate', color: 'bg-amber-100 text-amber-700', prophylaxis: 'LMWH or UFH + Mechanical' },
  { range: [5, Infinity], level: 'High', color: 'bg-red-100 text-red-700', prophylaxis: 'LMWH + Mechanical prophylaxis' },
];

// Comprehensive Caprini VTE Risk Assessment Components
const capriniFactors = {
  age: [
    { label: '41-60 years', points: 1 },
    { label: '61-74 years', points: 2 },
    { label: '≥75 years', points: 3 },
  ],
  surgeryType: [
    { label: 'Minor surgery', points: 1 },
    { label: 'Major surgery (>45 min)', points: 2 },
    { label: 'Laparoscopic surgery (>45 min)', points: 2 },
    { label: 'Arthroscopic surgery', points: 2 },
  ],
  clinicalHistory: [
    { label: 'Swollen legs (current)', points: 1 },
    { label: 'Varicose veins', points: 1 },
    { label: 'Obesity (BMI >25)', points: 1 },
    { label: 'Acute MI', points: 1 },
    { label: 'Congestive heart failure (<1 month)', points: 1 },
    { label: 'Sepsis (<1 month)', points: 1 },
    { label: 'Serious lung disease (<1 month)', points: 1 },
    { label: 'Abnormal pulmonary function (COPD)', points: 1 },
    { label: 'Medical patient currently at bed rest', points: 1 },
    { label: 'Inflammatory bowel disease', points: 1 },
    { label: 'History of prior major surgery (<1 month)', points: 1 },
  ],
  moderateRisk: [
    { label: 'Malignancy (present or previous)', points: 2 },
    { label: 'Central venous access', points: 2 },
    { label: 'Confined to bed (>72 hours)', points: 2 },
    { label: 'Immobilizing plaster cast', points: 2 },
  ],
  highRisk: [
    { label: 'History of DVT/PE', points: 3 },
    { label: 'Family history of DVT/PE', points: 3 },
    { label: 'Factor V Leiden', points: 3 },
    { label: 'Prothrombin 20210A', points: 3 },
    { label: 'Lupus anticoagulant', points: 3 },
    { label: 'Anticardiolipin antibodies', points: 3 },
    { label: 'Elevated serum homocysteine', points: 3 },
    { label: 'Heparin-induced thrombocytopenia (HIT)', points: 3 },
    { label: 'Other congenital/acquired thrombophilia', points: 3 },
  ],
  veryHighRisk: [
    { label: 'Stroke (<1 month)', points: 5 },
    { label: 'Elective arthroplasty', points: 5 },
    { label: 'Hip, pelvis or leg fracture', points: 5 },
    { label: 'Acute spinal cord injury (<1 month)', points: 5 },
    { label: 'Multiple trauma (<1 month)', points: 5 },
  ],
  femaleFactors: [
    { label: 'Oral contraceptives or HRT', points: 1 },
    { label: 'Pregnancy or postpartum (<1 month)', points: 1 },
    { label: 'History of unexplained stillbirth', points: 1 },
    { label: 'History of recurrent spontaneous abortion (≥3)', points: 1 },
  ],
};

// WHO Surgical Risk Factors
const whoRiskFactors = [
  'Diabetes Mellitus',
  'Hypertension',
  'Cardiovascular Disease',
  'Chronic Kidney Disease',
  'Chronic Liver Disease',
  'Respiratory Disease (COPD/Asthma)',
  'Obesity (BMI >30)',
  'Malnutrition',
  'Immunocompromised State',
  'HIV/AIDS',
  'Active Malignancy',
  'Previous Stroke/TIA',
  'Bleeding Disorder',
  'Anticoagulant Therapy',
  'Smoking',
  'Alcohol Use Disorder',
  'Pregnancy',
  'Elderly (>65 years)',
  'Anemia',
  'Sepsis/Infection',
  'Recent Surgery (<30 days)',
  'Previous Adverse Reaction to Anaesthesia',
  'Difficult Airway',
  'Sleep Apnea',
  'Sickle Cell Disease',
];

// Pre-operative investigations with normal values
const preOpInvestigations = {
  haematology: [
    { name: 'Haemoglobin', unit: 'g/dL', normalMale: '13-17', normalFemale: '12-16' },
    { name: 'PCV/Haematocrit', unit: '%', normalMale: '40-54', normalFemale: '36-48' },
    { name: 'WBC Count', unit: 'x10⁹/L', normalMale: '4.0-11.0', normalFemale: '4.0-11.0' },
    { name: 'Platelet Count', unit: 'x10⁹/L', normalMale: '150-400', normalFemale: '150-400' },
    { name: 'PT/INR', unit: 'seconds/ratio', normalMale: '11-13.5/0.8-1.2', normalFemale: '11-13.5/0.8-1.2' },
    { name: 'APTT', unit: 'seconds', normalMale: '25-35', normalFemale: '25-35' },
  ],
  biochemistry: [
    { name: 'Sodium', unit: 'mmol/L', normalMale: '135-145', normalFemale: '135-145' },
    { name: 'Potassium', unit: 'mmol/L', normalMale: '3.5-5.0', normalFemale: '3.5-5.0' },
    { name: 'Urea', unit: 'mmol/L', normalMale: '2.5-6.7', normalFemale: '2.5-6.7' },
    { name: 'Creatinine', unit: 'µmol/L', normalMale: '62-106', normalFemale: '44-80' },
    { name: 'Fasting Blood Glucose', unit: 'mmol/L', normalMale: '3.9-5.6', normalFemale: '3.9-5.6' },
  ],
  other: [
    { name: 'Blood Group & Crossmatch', unit: '', normalMale: 'A/B/AB/O ± Rh', normalFemale: 'A/B/AB/O ± Rh' },
    { name: 'ECG', unit: '', normalMale: 'Normal sinus rhythm', normalFemale: 'Normal sinus rhythm' },
    { name: 'Chest X-Ray', unit: '', normalMale: 'Normal', normalFemale: 'Normal' },
  ],
};

export default function SurgeryPlanningPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'assessment' | 'investigations' | 'team' | 'estimate' | 'documents'>('details');
  
  // Surgery record state - for independent section saves
  const [surgeryId, setSurgeryId] = useState<string | null>(null);
  const [sectionCompletion, setSectionCompletion] = useState({
    details: false,
    assessment: false,
    investigations: false,
    team: false,
    estimate: false,
    documents: false,
  });
  
  // Procedure selection state
  const [procedureSearch, setProcedureSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProcedure, setSelectedProcedure] = useState<SurgicalProcedure | null>(null);
  const [showProcedureDropdown, setShowProcedureDropdown] = useState(false);
  
  // Caprini VTE state
  const [selectedCapriniFactors, setSelectedCapriniFactors] = useState<string[]>([]);
  const [expandedCapriniSections, setExpandedCapriniSections] = useState<string[]>(['age', 'surgeryType']);
  
  // Risk factors state
  const [selectedRiskFactors, setSelectedRiskFactors] = useState<string[]>([]);
  
  // Investigation results state - tracks all lab values
  const [investigationResults, setInvestigationResults] = useState<Record<string, { value: string; status: 'pending' | 'normal' | 'abnormal' }>>({});
  
  // Fee estimate state
  const [feeEstimate, setFeeEstimate] = useState<SurgicalFeeEstimate | null>(null);
  const [customSurgeonFee, setCustomSurgeonFee] = useState<number | undefined>();
  const [customAnaesthesiaFee, setCustomAnaesthesiaFee] = useState<number | undefined>();
  const [customTheatreConsumables, setCustomTheatreConsumables] = useState<number | undefined>();
  const [customPostOpMedications, setCustomPostOpMedications] = useState<number | undefined>();

  // Handle investigation value change
  const handleInvestigationChange = (testName: string, value: string, normalRange: string) => {
    let status: 'pending' | 'normal' | 'abnormal' = 'pending';
    
    if (value.trim()) {
      // Try to determine if value is within normal range
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        // Parse normal range (e.g., "13-17" or "3.5-5.0")
        const rangeMatch = normalRange.match(/(\d+\.?\d*)-(\d+\.?\d*)/);
        if (rangeMatch) {
          const min = parseFloat(rangeMatch[1]);
          const max = parseFloat(rangeMatch[2]);
          status = (numValue >= min && numValue <= max) ? 'normal' : 'abnormal';
        } else {
          // Non-numeric range, mark as normal if value entered
          status = 'normal';
        }
      } else {
        // Text value entered (e.g., blood group, ECG result)
        status = 'normal';
      }
    }
    
    setInvestigationResults(prev => ({
      ...prev,
      [testName]: { value, status }
    }));
  };

  const patient = useLiveQuery(
    () => patientId ? db.patients.get(patientId) : undefined,
    [patientId]
  );

  // Fetch recent investigations for this patient (within one week of surgery date)
  const recentInvestigations = useLiveQuery(
    async () => {
      if (!patientId) return [];
      const investigations = await db.investigations
        .where('patientId')
        .equals(patientId)
        .toArray();
      // Filter to completed investigations within the last 7 days
      const oneWeekAgo = subDays(new Date(), 7);
      return investigations.filter(inv => 
        inv.status === 'completed' && 
        inv.completedAt && 
        isWithinInterval(new Date(inv.completedAt), { start: oneWeekAgo, end: new Date() })
      );
    },
    [patientId]
  );

  // Auto-fill investigation results from recent completed investigations
  const autoFillInvestigations = useCallback((investigations: Investigation[]) => {
    if (!investigations || investigations.length === 0) return;

    const newResults: Record<string, { value: string; status: 'pending' | 'normal' | 'abnormal' }> = {};
    
    investigations.forEach(inv => {
      if (inv.results && inv.results.length > 0) {
        inv.results.forEach(result => {
          // Map result parameter to our pre-op investigation names
          const status = result.status === 'normal' ? 'normal' : 
                        result.status === 'low' || result.status === 'high' || result.status === 'critical' || result.status === 'abnormal' ? 'abnormal' : 
                        'pending';
          newResults[result.parameter] = {
            value: String(result.value),
            status
          };
        });
      }
    });

    if (Object.keys(newResults).length > 0) {
      setInvestigationResults(prev => ({ ...prev, ...newResults }));
      toast.success(`Auto-filled ${Object.keys(newResults).length} investigation results from recent tests`);
    }
  }, []);

  // Effect to auto-fill when recent investigations are loaded
  useEffect(() => {
    if (recentInvestigations && recentInvestigations.length > 0) {
      autoFillInvestigations(recentInvestigations);
    }
  }, [recentInvestigations, autoFillInvestigations]);

  // Fetch surgical team members from database by role
  const surgicalTeamMembers = useLiveQuery(async () => {
    const allUsers = await db.users.toArray();
    return {
      assistants: allUsers.filter(u => ['surgeon', 'doctor'].includes(u.role)),
      anaesthetists: allUsers.filter(u => u.role === 'anaesthetist'),
      nurses: allUsers.filter(u => u.role === 'nurse'),
    };
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SurgeryFormData>({
    resolver: zodResolver(surgerySchema),
    defaultValues: {
      type: 'elective',
      category: 'major',
      asaScore: 1,
      npoStatus: false,
      consentSigned: false,
      bloodTyped: false,
      includeHistology: false,
    },
  });

  // Auto-populate risk factors from patient data
  useEffect(() => {
    if (!patient) return;

    const autoCapriniFactors: string[] = [];
    const autoRiskFactors: string[] = [];

    // Calculate age and set appropriate Caprini age factor
    const age = differenceInYears(new Date(), new Date(patient.dateOfBirth));
    if (age >= 75) {
      autoCapriniFactors.push('≥75 years');
    } else if (age >= 61) {
      autoCapriniFactors.push('61-74 years');
    } else if (age >= 41) {
      autoCapriniFactors.push('41-60 years');
    }

    // Auto-fill from patient's existing DVT risk assessment
    if (patient.dvtRiskAssessment?.riskFactors) {
      patient.dvtRiskAssessment.riskFactors.forEach(factor => {
        if (!autoCapriniFactors.includes(factor)) {
          autoCapriniFactors.push(factor);
        }
      });
    }

    // Map chronic conditions to WHO risk factors
    const conditionMapping: Record<string, string> = {
      'diabetes': 'Diabetes Mellitus',
      'hypertension': 'Hypertension',
      'heart disease': 'Cardiovascular Disease',
      'cardiac': 'Cardiovascular Disease',
      'kidney disease': 'Chronic Kidney Disease',
      'renal': 'Chronic Kidney Disease',
      'liver disease': 'Chronic Liver Disease',
      'hepatitis': 'Chronic Liver Disease',
      'asthma': 'Respiratory Disease (COPD/Asthma)',
      'copd': 'Respiratory Disease (COPD/Asthma)',
      'obesity': 'Obesity (BMI >30)',
      'hiv': 'HIV/AIDS',
      'cancer': 'Active Malignancy',
      'malignancy': 'Active Malignancy',
      'stroke': 'Previous Stroke/TIA',
      'tia': 'Previous Stroke/TIA',
      'bleeding': 'Bleeding Disorder',
      'anemia': 'Anemia',
      'sickle cell': 'Sickle Cell Disease',
      'sleep apnea': 'Sleep Apnea',
    };

    patient.chronicConditions?.forEach(condition => {
      const lowerCondition = condition.toLowerCase();
      Object.entries(conditionMapping).forEach(([key, value]) => {
        if (lowerCondition.includes(key) && !autoRiskFactors.includes(value)) {
          autoRiskFactors.push(value);
        }
      });
    });

    // Map comorbidities to WHO risk factors
    patient.comorbidities?.forEach(comorbidity => {
      const lowerCondition = comorbidity.condition.toLowerCase();
      Object.entries(conditionMapping).forEach(([key, value]) => {
        if (lowerCondition.includes(key) && !autoRiskFactors.includes(value)) {
          autoRiskFactors.push(value);
        }
      });
    });

    // Add elderly risk factor if age > 65
    if (age > 65 && !autoRiskFactors.includes('Elderly (>65 years)')) {
      autoRiskFactors.push('Elderly (>65 years)');
    }

    // Update state if we found factors
    if (autoCapriniFactors.length > 0) {
      setSelectedCapriniFactors(prev => {
        const merged = [...prev];
        autoCapriniFactors.forEach(f => {
          if (!merged.includes(f)) merged.push(f);
        });
        return merged;
      });
    }

    if (autoRiskFactors.length > 0) {
      setSelectedRiskFactors(prev => {
        const merged = [...prev];
        autoRiskFactors.forEach(f => {
          if (!merged.includes(f)) merged.push(f);
        });
        return merged;
      });
      toast.success(`Auto-populated ${autoRiskFactors.length} risk factors from patient record`);
    }

    // Pre-check blood typing if patient has blood group recorded
    if (patient.bloodGroup) {
      setValue('bloodTyped', true);
    }
  }, [patient, setValue]);

  const asaScore = watch('asaScore');
  const anaesthesiaType = watch('anaesthesiaType');
  const includeHistology = watch('includeHistology');

  // Calculate Caprini score from selected factors
  const calculatedCapriniScore = useMemo(() => {
    let score = 0;
    Object.entries(capriniFactors).forEach(([, factors]) => {
      factors.forEach(factor => {
        if (selectedCapriniFactors.includes(factor.label)) {
          score += factor.points;
        }
      });
    });
    return score;
  }, [selectedCapriniFactors]);

  // Get Caprini risk level
  const getCapriniRiskLevel = (score: number) => {
    return capriniRiskLevels.find(r => score >= r.range[0] && score <= r.range[1]);
  };

  // Filter procedures based on search and category
  const filteredProcedures = useMemo(() => {
    let procedures = surgicalProcedures;
    if (selectedCategory) {
      procedures = procedures.filter(p => p.category === selectedCategory);
    }
    if (procedureSearch) {
      procedures = procedures.filter(p => 
        p.name.toLowerCase().includes(procedureSearch.toLowerCase()) ||
        (p.icdCode && p.icdCode.toLowerCase().includes(procedureSearch.toLowerCase()))
      );
    }
    return procedures;
  }, [selectedCategory, procedureSearch]);

  // Update fee estimate when procedure or options change
  useEffect(() => {
    if (selectedProcedure) {
      const baseEstimate = calculateSurgicalFeeEstimate(selectedProcedure, {
        customSurgeonFee,
        includeHistology: includeHistology || false,
        anaesthesiaType: anaesthesiaType as 'local' | 'regional' | 'general' | undefined,
      });
      
      // Apply custom overrides if set
      const surgeonFee = customSurgeonFee ?? baseEstimate.surgeonFee;
      const anaesthesiaFee = customAnaesthesiaFee ?? baseEstimate.anaesthesiaFee;
      const theatreConsumables = customTheatreConsumables ?? baseEstimate.theatreConsumables;
      const postOpMedications = customPostOpMedications ?? baseEstimate.postOpMedications;
      const histologyFee = baseEstimate.histologyFee;
      
      const totalEstimate = surgeonFee + anaesthesiaFee + theatreConsumables + postOpMedications + histologyFee;
      
      setFeeEstimate({
        ...baseEstimate,
        surgeonFee,
        anaesthesiaFee,
        theatreConsumables,
        postOpMedications,
        totalEstimate,
      });
    }
  }, [selectedProcedure, customSurgeonFee, customAnaesthesiaFee, customTheatreConsumables, customPostOpMedications, includeHistology, anaesthesiaType]);

  // Handle procedure selection
  const handleProcedureSelect = (procedure: SurgicalProcedure) => {
    setSelectedProcedure(procedure);
    setValue('procedureName', procedure.name);
    setValue('procedureCode', procedure.icdCode || '');
    setValue('procedureId', procedure.id);
    
    // Map complexity to category
    const categoryMap: Record<string, 'minor' | 'intermediate' | 'major' | 'super_major'> = {
      level1: 'minor',
      level2: 'intermediate',
      level3: 'major',
      level4: 'super_major',
    };
    setValue('category', categoryMap[procedure.complexity]);
    
    setCustomSurgeonFee(procedure.defaultFee);
    setValue('surgeonFee', procedure.defaultFee);
    setShowProcedureDropdown(false);
    setProcedureSearch('');
  };

  // Toggle Caprini factor
  const toggleCapriniFactor = (factor: string) => {
    setSelectedCapriniFactors(prev => 
      prev.includes(factor) 
        ? prev.filter(f => f !== factor)
        : [...prev, factor]
    );
  };

  // Toggle risk factor
  const toggleRiskFactor = (factor: string) => {
    setSelectedRiskFactors(prev =>
      prev.includes(factor)
        ? prev.filter(f => f !== factor)
        : [...prev, factor]
    );
  };

  // Save Procedure Details section
  const saveDetailsSection = async () => {
    const data = watch();
    if (!patientId || !user) return;
    
    if (!data.procedureName || !data.scheduledDate) {
      toast.error('Please fill in procedure name and scheduled date');
      return;
    }

    setIsLoading(true);
    try {
      if (surgeryId) {
        // Update existing surgery
        await db.surgeries.update(surgeryId, {
          procedureName: data.procedureName,
          procedureCode: data.procedureCode,
          type: data.type,
          category: data.category as 'minor' | 'intermediate' | 'major' | 'super_major',
          scheduledDate: new Date(data.scheduledDate),
          anaesthesiaType: data.anaesthesiaType as AnaesthesiaType | undefined,
          updatedAt: new Date(),
        });
        toast.success('Procedure details saved!');
      } else {
        // Create new surgery record with minimal data
        const newSurgeryId = uuidv4();
        const surgery: Surgery = {
          id: newSurgeryId,
          patientId,
          hospitalId: user.hospitalId || 'hospital-1',
          procedureName: data.procedureName,
          procedureCode: data.procedureCode,
          type: data.type,
          category: data.category as 'minor' | 'intermediate' | 'major' | 'super_major',
          preOperativeAssessment: {
            asaScore: 1,
            npoStatus: false,
            consentSigned: false,
            bloodTyped: false,
            investigations: [],
            riskFactors: [],
          },
          scheduledDate: new Date(data.scheduledDate),
          status: 'incomplete_preparation',
          outstandingItems: [
            { id: uuidv4(), type: 'risk_assessment', label: 'Risk Assessment', description: 'Complete ASA and Caprini assessment', completed: false },
            { id: uuidv4(), type: 'investigations', label: 'Investigations', description: 'Complete pre-operative investigations', completed: false },
            { id: uuidv4(), type: 'consent', label: 'Informed Consent', description: 'Patient must sign consent form', completed: false },
            { id: uuidv4(), type: 'blood_typing', label: 'Blood Typing', description: 'Complete blood type and cross-match', completed: false },
            { id: uuidv4(), type: 'team_assignment', label: 'Team Assignment', description: 'Assign surgical team', completed: false },
          ],
          surgeon: `${user.firstName} ${user.lastName}` || user.email || 'Unknown Surgeon',
          surgeonId: user.id,
          anaesthesiaType: data.anaesthesiaType as AnaesthesiaType | undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await db.surgeries.add(surgery);
        syncRecord('surgeries', surgery as unknown as Record<string, unknown>);
        setSurgeryId(newSurgeryId);
        toast.success('Surgery created! Continue filling in other sections.');
      }
      setSectionCompletion(prev => ({ ...prev, details: true }));
    } catch (error) {
      console.error('Error saving details:', error);
      toast.error('Failed to save procedure details');
    } finally {
      setIsLoading(false);
    }
  };

  // Save Risk Assessment section
  const saveAssessmentSection = async () => {
    const data = watch();
    if (!surgeryId) {
      toast.error('Please save Procedure Details first');
      return;
    }

    setIsLoading(true);
    try {
      const existingSurgery = await db.surgeries.get(surgeryId);
      if (!existingSurgery) {
        toast.error('Surgery record not found');
        return;
      }

      const updatedAssessment: PreOperativeAssessment = {
        ...existingSurgery.preOperativeAssessment,
        asaScore: data.asaScore as 1 | 2 | 3 | 4 | 5,
        capriniScore: calculatedCapriniScore,
        mallampatiScore: data.mallampatiScore as 1 | 2 | 3 | 4 | undefined,
        riskFactors: selectedRiskFactors,
        specialInstructions: data.specialInstructions,
      };

      // Update outstanding items
      const outstandingItems = existingSurgery.outstandingItems?.map(item => 
        item.type === 'risk_assessment' 
          ? { ...item, completed: true, completedAt: new Date() }
          : item
      ) || [];

      await db.surgeries.update(surgeryId, {
        preOperativeAssessment: updatedAssessment,
        outstandingItems,
        updatedAt: new Date(),
      });

      // Sync the updated record
      const updatedSurgery = await db.surgeries.get(surgeryId);
      if (updatedSurgery) {
        syncRecord('surgeries', updatedSurgery as unknown as Record<string, unknown>);
      }

      setSectionCompletion(prev => ({ ...prev, assessment: true }));
      toast.success('Risk assessment saved!');
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast.error('Failed to save risk assessment');
    } finally {
      setIsLoading(false);
    }
  };

  // Save Investigations section
  const saveInvestigationsSection = async () => {
    if (!surgeryId) {
      toast.error('Please save Procedure Details first');
      return;
    }

    setIsLoading(true);
    try {
      const existingSurgery = await db.surgeries.get(surgeryId);
      if (!existingSurgery) {
        toast.error('Surgery record not found');
        return;
      }

      // Build investigations list from entered values
      const completedInvestigations: string[] = [];
      Object.entries(investigationResults).forEach(([name, result]) => {
        if (result.value.trim()) {
          completedInvestigations.push(`${name}: ${result.value} (${result.status})`);
        }
      });

      const updatedAssessment: PreOperativeAssessment = {
        ...existingSurgery.preOperativeAssessment,
        investigations: completedInvestigations,
      };

      // Update outstanding items
      const hasInvestigations = completedInvestigations.length > 0;
      const outstandingItems = existingSurgery.outstandingItems?.map(item => 
        item.type === 'investigations' 
          ? { ...item, completed: hasInvestigations, completedAt: hasInvestigations ? new Date() : undefined }
          : item
      ) || [];

      await db.surgeries.update(surgeryId, {
        preOperativeAssessment: updatedAssessment,
        outstandingItems,
        updatedAt: new Date(),
      });

      const updatedSurgery = await db.surgeries.get(surgeryId);
      if (updatedSurgery) {
        syncRecord('surgeries', updatedSurgery as unknown as Record<string, unknown>);
      }

      setSectionCompletion(prev => ({ ...prev, investigations: true }));
      toast.success(`Saved ${completedInvestigations.length} investigation results!`);
    } catch (error) {
      console.error('Error saving investigations:', error);
      toast.error('Failed to save investigations');
    } finally {
      setIsLoading(false);
    }
  };

  // Save Surgical Team section
  const saveTeamSection = async () => {
    const data = watch();
    if (!surgeryId) {
      toast.error('Please save Procedure Details first');
      return;
    }

    setIsLoading(true);
    try {
      const existingSurgery = await db.surgeries.get(surgeryId);
      if (!existingSurgery) {
        toast.error('Surgery record not found');
        return;
      }

      const hasTeam = !!data.assistant && !!data.anaesthetist;
      
      // Update outstanding items
      const outstandingItems = existingSurgery.outstandingItems?.map(item => 
        item.type === 'team_assignment' 
          ? { ...item, completed: hasTeam, completedAt: hasTeam ? new Date() : undefined }
          : item
      ) || [];

      await db.surgeries.update(surgeryId, {
        assistant: data.assistant,
        anaesthetist: data.anaesthetist,
        scrubNurse: data.scrubNurse,
        circulatingNurse: data.circulatingNurse,
        outstandingItems,
        updatedAt: new Date(),
      });

      const updatedSurgery = await db.surgeries.get(surgeryId);
      if (updatedSurgery) {
        syncRecord('surgeries', updatedSurgery as unknown as Record<string, unknown>);
      }

      setSectionCompletion(prev => ({ ...prev, team: true }));
      toast.success('Surgical team saved!');
    } catch (error) {
      console.error('Error saving team:', error);
      toast.error('Failed to save surgical team');
    } finally {
      setIsLoading(false);
    }
  };

  // Save Fee Estimate section
  const saveEstimateSection = async () => {
    const data = watch();
    if (!surgeryId) {
      toast.error('Please save Procedure Details first');
      return;
    }

    setIsLoading(true);
    try {
      await db.surgeries.update(surgeryId, {
        surgeonFee: data.surgeonFee || customSurgeonFee,
        updatedAt: new Date(),
      });

      const updatedSurgery = await db.surgeries.get(surgeryId);
      if (updatedSurgery) {
        syncRecord('surgeries', updatedSurgery as unknown as Record<string, unknown>);
      }

      setSectionCompletion(prev => ({ ...prev, estimate: true }));
      toast.success('Fee estimate saved!');
    } catch (error) {
      console.error('Error saving estimate:', error);
      toast.error('Failed to save fee estimate');
    } finally {
      setIsLoading(false);
    }
  };

  // Save Pre-op Checklist section
  const saveChecklistSection = async () => {
    const data = watch();
    if (!surgeryId) {
      toast.error('Please save Procedure Details first');
      return;
    }

    setIsLoading(true);
    try {
      const existingSurgery = await db.surgeries.get(surgeryId);
      if (!existingSurgery) {
        toast.error('Surgery record not found');
        return;
      }

      const updatedAssessment: PreOperativeAssessment = {
        ...existingSurgery.preOperativeAssessment,
        npoStatus: data.npoStatus,
        consentSigned: data.consentSigned,
        bloodTyped: data.bloodTyped,
        specialInstructions: data.specialInstructions,
      };

      // Update outstanding items
      const outstandingItems = existingSurgery.outstandingItems?.map(item => {
        if (item.type === 'consent') {
          return { ...item, completed: data.consentSigned, completedAt: data.consentSigned ? new Date() : undefined };
        }
        if (item.type === 'blood_typing') {
          return { ...item, completed: data.bloodTyped, completedAt: data.bloodTyped ? new Date() : undefined };
        }
        if (item.type === 'npo_status') {
          return { ...item, completed: data.npoStatus, completedAt: data.npoStatus ? new Date() : undefined };
        }
        return item;
      }) || [];

      // Check if all items are complete
      const allComplete = outstandingItems.every(item => item.completed);
      const newStatus: Surgery['status'] = allComplete ? 'ready_for_preanaesthetic_review' : 'incomplete_preparation';

      await db.surgeries.update(surgeryId, {
        preOperativeAssessment: updatedAssessment,
        outstandingItems,
        status: newStatus,
        updatedAt: new Date(),
      });

      const updatedSurgery = await db.surgeries.get(surgeryId);
      if (updatedSurgery) {
        syncRecord('surgeries', updatedSurgery as unknown as Record<string, unknown>);
      }

      setSectionCompletion(prev => ({ ...prev, documents: true }));
      
      if (allComplete) {
        toast.success('All sections complete! Surgery is ready for pre-anaesthetic review.');
      } else {
        toast.success('Checklist saved!');
      }
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast.error('Failed to save checklist');
    } finally {
      setIsLoading(false);
    }
  };

  // Get section save function based on active tab
  const getSectionSaveFunction = () => {
    switch (activeTab) {
      case 'details': return saveDetailsSection;
      case 'assessment': return saveAssessmentSection;
      case 'investigations': return saveInvestigationsSection;
      case 'team': return saveTeamSection;
      case 'estimate': return saveEstimateSection;
      case 'documents': return saveChecklistSection;
      default: return saveDetailsSection;
    }
  };

  const onSubmit = async (data: SurgeryFormData) => {
    if (!patientId || !user) return;
    setIsLoading(true);

    try {
      // Build investigations list from entered values
      const completedInvestigations: string[] = [];
      Object.entries(investigationResults).forEach(([name, result]) => {
        if (result.value.trim()) {
          completedInvestigations.push(`${name}: ${result.value} (${result.status})`);
        }
      });
      
      // Add any additional investigations from the text field
      if (data.investigations) {
        const additional = data.investigations.split(',').map(i => i.trim()).filter(Boolean);
        completedInvestigations.push(...additional);
      }

      const preOpAssessment: PreOperativeAssessment = {
        asaScore: data.asaScore as 1 | 2 | 3 | 4 | 5,
        capriniScore: calculatedCapriniScore,
        mallampatiScore: data.mallampatiScore as 1 | 2 | 3 | 4 | undefined,
        npoStatus: data.npoStatus,
        consentSigned: data.consentSigned,
        bloodTyped: data.bloodTyped,
        investigations: completedInvestigations,
        riskFactors: selectedRiskFactors,
        specialInstructions: data.specialInstructions,
      };

      // Calculate outstanding preparation items
      const outstandingItems: OutstandingPreparationItem[] = [];
      
      // Check risk assessment completion (ASA + Caprini)
      const hasRiskAssessment = selectedCapriniFactors.length > 0 || calculatedCapriniScore > 0;
      outstandingItems.push({
        id: uuidv4(),
        type: 'risk_assessment',
        label: 'Risk Assessment',
        description: 'Complete ASA classification and Caprini VTE risk score',
        completed: hasRiskAssessment,
        completedAt: hasRiskAssessment ? new Date() : undefined,
      });

      // Check investigations completion
      const hasInvestigations = completedInvestigations.length > 0;
      outstandingItems.push({
        id: uuidv4(),
        type: 'investigations',
        label: 'Pre-operative Investigations',
        description: 'Complete required blood work and imaging studies',
        completed: hasInvestigations,
        completedAt: hasInvestigations ? new Date() : undefined,
      });

      // Check consent
      outstandingItems.push({
        id: uuidv4(),
        type: 'consent',
        label: 'Informed Consent',
        description: 'Patient must sign informed consent form',
        completed: data.consentSigned,
        completedAt: data.consentSigned ? new Date() : undefined,
      });

      // Check blood typing
      outstandingItems.push({
        id: uuidv4(),
        type: 'blood_typing',
        label: 'Blood Typing & Grouping',
        description: 'Complete blood type and cross-match',
        completed: data.bloodTyped,
        completedAt: data.bloodTyped ? new Date() : undefined,
      });

      // Check team assignment
      const hasTeam = !!data.assistant && !!data.anaesthetist;
      outstandingItems.push({
        id: uuidv4(),
        type: 'team_assignment',
        label: 'Surgical Team Assignment',
        description: 'Assign assistant surgeon and anaesthetist',
        completed: hasTeam,
        completedAt: hasTeam ? new Date() : undefined,
      });

      // Check NPO status (only flagged if surgery is within 24 hours)
      const surgeryDate = new Date(data.scheduledDate);
      const isWithin24Hours = (surgeryDate.getTime() - Date.now()) < 24 * 60 * 60 * 1000;
      if (isWithin24Hours) {
        outstandingItems.push({
          id: uuidv4(),
          type: 'npo_status',
          label: 'NPO Status Confirmed',
          description: 'Confirm patient is nil per os (fasting)',
          completed: data.npoStatus,
          completedAt: data.npoStatus ? new Date() : undefined,
        });
      }

      // Determine surgery status based on completion
      const incompleteItems = outstandingItems.filter(item => !item.completed);
      let surgeryStatus: Surgery['status'];
      
      if (incompleteItems.length === 0) {
        surgeryStatus = 'ready_for_preanaesthetic_review';
      } else {
        surgeryStatus = 'incomplete_preparation';
      }

      if (surgeryId) {
        // Update existing surgery record
        await db.surgeries.update(surgeryId, {
          procedureName: data.procedureName,
          procedureCode: data.procedureCode,
          type: data.type,
          category: data.category as 'minor' | 'intermediate' | 'major' | 'super_major',
          preOperativeAssessment: preOpAssessment,
          scheduledDate: new Date(data.scheduledDate),
          status: surgeryStatus,
          outstandingItems: incompleteItems.length > 0 ? outstandingItems : undefined,
          surgeonFee: data.surgeonFee,
          assistant: data.assistant,
          anaesthetist: data.anaesthetist,
          scrubNurse: data.scrubNurse,
          circulatingNurse: data.circulatingNurse,
          anaesthesiaType: data.anaesthesiaType as AnaesthesiaType | undefined,
          updatedAt: new Date(),
        });

        const updatedSurgery = await db.surgeries.get(surgeryId);
        if (updatedSurgery) {
          syncRecord('surgeries', updatedSurgery as unknown as Record<string, unknown>);
        }
      } else {
        // Create new surgery record
        const surgery: Surgery = {
          id: uuidv4(),
          patientId,
          hospitalId: user.hospitalId || 'hospital-1',
          procedureName: data.procedureName,
          procedureCode: data.procedureCode,
          type: data.type,
          category: data.category as 'minor' | 'intermediate' | 'major' | 'super_major',
          preOperativeAssessment: preOpAssessment,
          scheduledDate: new Date(data.scheduledDate),
          status: surgeryStatus,
          outstandingItems: incompleteItems.length > 0 ? outstandingItems : undefined,
          surgeon: `${user.firstName} ${user.lastName}` || user.email || 'Unknown Surgeon',
          surgeonId: user.id,
          surgeonFee: data.surgeonFee,
          assistant: data.assistant,
          anaesthetist: data.anaesthetist,
          scrubNurse: data.scrubNurse,
          circulatingNurse: data.circulatingNurse,
          anaesthesiaType: data.anaesthesiaType as AnaesthesiaType | undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.surgeries.add(surgery);
        syncRecord('surgeries', surgery as unknown as Record<string, unknown>);
      }
      
      if (surgeryStatus === 'incomplete_preparation') {
        toast.success(`Surgery ${surgeryId ? 'updated' : 'scheduled'} with ${incompleteItems.length} outstanding items to complete`);
      } else {
        toast.success(`Surgery ${surgeryId ? 'finalized' : 'scheduled'} - Ready for pre-anaesthetic review!`);
      }
      navigate('/surgery');
    } catch (error) {
      console.error('Error scheduling surgery:', error);
      toast.error('Failed to schedule surgery');
    } finally {
      setIsLoading(false);
    }
  };

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading patient...</p>
      </div>
    );
  }

  const capriniRisk = getCapriniRiskLevel(calculatedCapriniScore);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <button
          onClick={() => navigate(`/patients/${patientId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 w-fit"
        >
          <ArrowLeft size={18} />
          Back to Patient
        </button>
        
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Scissors className="w-6 h-6 sm:w-7 sm:h-7 text-purple-500" />
            Surgery Planning
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Patient: {patient.firstName} {patient.lastName} ({patient.hospitalNumber})
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 sm:gap-2 border-b border-gray-200 -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            { id: 'details', label: 'Procedure Details', icon: Scissors },
            { id: 'assessment', label: 'Risk Assessment', icon: AlertTriangle },
            { id: 'investigations', label: 'Investigations', icon: Beaker },
            { id: 'team', label: 'Surgical Team', icon: Users },
            { id: 'estimate', label: 'Fee Estimate', icon: DollarSign },
            { id: 'documents', label: 'Documents', icon: FileText },
          ].map(tab => {
            const isComplete = sectionCompletion[tab.id as keyof typeof sectionCompletion];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap relative ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                {isComplete && (
                  <CheckCircle size={14} className="text-green-500 ml-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Procedure Details Tab */}
        {activeTab === 'details' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Procedure Selection Card */}
            <div className="card">
              <div className="card-header flex items-center gap-3">
                <Scissors className="w-5 h-5 text-purple-500" />
                <h2 className="font-semibold text-gray-900">Select Procedure</h2>
              </div>
              <div className="card-body space-y-4">
                {/* Category Filter */}
                <div>
                  <label className="label">Procedure Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="input"
                    title="Select procedure category"
                  >
                    <option value="">All Categories</option>
                    {procedureCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Procedure Search */}
                <div className="relative">
                  <label className="label">Search Procedure *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={procedureSearch || (selectedProcedure?.name || '')}
                      onChange={(e) => {
                        setProcedureSearch(e.target.value);
                        setShowProcedureDropdown(true);
                      }}
                      onFocus={() => setShowProcedureDropdown(true)}
                      placeholder="Type to search procedures or ICD-10 codes..."
                      className="input pl-10"
                    />
                  </div>
                  
                  {/* Procedure Dropdown */}
                  <AnimatePresence>
                    {showProcedureDropdown && filteredProcedures.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
                      >
                        {filteredProcedures.slice(0, 20).map(procedure => (
                          <button
                            key={procedure.id}
                            type="button"
                            onClick={() => handleProcedureSelect(procedure)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{procedure.name}</p>
                                <p className="text-sm text-gray-500">{procedure.icdCode}</p>
                              </div>
                              <div className="text-right">
                                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${complexityLevels[procedure.complexity].color}`}>
                                  {procedure.complexityLabel}
                                </span>
                                <p className="text-sm font-medium text-gray-900 mt-1">
                                  {formatNaira(procedure.defaultFee)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Selected Procedure Display */}
                {selectedProcedure && (
                  <div className={`p-4 rounded-lg border-2 ${complexityLevels[selectedProcedure.complexity].color}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{selectedProcedure.name}</h3>
                        <p className="text-sm opacity-80">ICD-10: {selectedProcedure.icdCode}</p>
                        <p className="text-sm opacity-80 mt-1">{selectedProcedure.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg">{formatNaira(selectedProcedure.defaultFee)}</span>
                        <p className="text-xs opacity-80">Surgeon's Fee</p>
                        <p className="text-xs opacity-80">Range: {formatNaira(selectedProcedure.minFee)} - {formatNaira(selectedProcedure.maxFee)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {errors.procedureName && (
                  <p className="text-sm text-red-500">{errors.procedureName.message}</p>
                )}
              </div>
            </div>

            {/* Schedule & Type Card */}
            <div className="card">
              <div className="card-header flex items-center gap-3">
                <ClipboardCheck className="w-5 h-5 text-sky-500" />
                <h2 className="font-semibold text-gray-900">Schedule & Details</h2>
              </div>
              <div className="card-body grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Procedure Code (ICD-10)</label>
                  <input 
                    {...register('procedureCode')} 
                    className="input bg-gray-50" 
                    readOnly={!!selectedProcedure}
                  />
                </div>

                <div>
                  <label className="label">Scheduled Date & Time *</label>
                  <input
                    type="datetime-local"
                    {...register('scheduledDate')}
                    className={`input ${errors.scheduledDate ? 'input-error' : ''}`}
                  />
                  {errors.scheduledDate && (
                    <p className="text-sm text-red-500 mt-1">{errors.scheduledDate.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Surgery Type *</label>
                  <select {...register('type')} className="input">
                    <option value="elective">Elective</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="label">Category *</label>
                  <select {...register('category')} className="input">
                    <option value="minor">Minor (Level 1)</option>
                    <option value="intermediate">Intermediate (Level 2)</option>
                    <option value="major">Major (Level 3)</option>
                    <option value="super_major">Super Major (Level 4)</option>
                  </select>
                </div>

                <div>
                  <label className="label">Anaesthesia Type</label>
                  <select {...register('anaesthesiaType')} className="input">
                    <option value="">Select type</option>
                    <option value="local">Local Anaesthesia</option>
                    <option value="regional">Regional (Spinal/Epidural)</option>
                    <option value="general">General Anaesthesia</option>
                    <option value="sedation">Sedation</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    {...register('includeHistology')}
                    id="includeHistology"
                    className="w-5 h-5 rounded text-purple-600"
                  />
                  <label htmlFor="includeHistology" className="cursor-pointer">
                    <span className="font-medium">Include Histopathology</span>
                    <p className="text-sm text-gray-500">Tissue specimen for pathological examination</p>
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Risk Assessment Tab */}
        {activeTab === 'assessment' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* ASA Score */}
            <div className="card">
              <div className="card-header flex items-center gap-3">
                <ClipboardCheck className="w-5 h-5 text-sky-500" />
                <h2 className="font-semibold text-gray-900">ASA Physical Status Classification</h2>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {asaDescriptions.map((asa) => (
                    <label
                      key={asa.score}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        asaScore === asa.score
                          ? 'border-sky-500 bg-sky-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        {...register('asaScore', { valueAsNumber: true })}
                        value={asa.score}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-medium">ASA {asa.score}</span>
                        <p className="text-sm text-gray-600">{asa.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Caprini VTE Score */}
            <div className="card">
              <div className="card-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <h2 className="font-semibold text-gray-900">Caprini VTE Risk Assessment</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <span className="text-xl sm:text-2xl font-bold text-gray-900">{calculatedCapriniScore}</span>
                    <p className="text-xs text-gray-500">Score</p>
                  </div>
                  {capriniRisk && (
                    <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${capriniRisk.color}`}>
                      {capriniRisk.level} Risk
                    </span>
                  )}
                </div>
              </div>
              <div className="card-body space-y-4">
                {capriniRisk && (
                  <div className={`p-3 rounded-lg ${capriniRisk.color}`}>
                    <p className="font-medium">Recommended Prophylaxis: {capriniRisk.prophylaxis}</p>
                  </div>
                )}

                {/* Caprini Factor Sections */}
                {Object.entries(capriniFactors).map(([section, factors]) => (
                  <div key={section} className="border rounded-lg">
                    <button
                      type="button"
                      onClick={() => setExpandedCapriniSections(prev =>
                        prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
                      )}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                    >
                      <span className="font-medium capitalize">{section.replace(/([A-Z])/g, ' $1').trim()}</span>
                      {expandedCapriniSections.includes(section) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {expandedCapriniSections.includes(section) && (
                      <div className="p-3 border-t bg-gray-50 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {factors.map(factor => (
                          <label
                            key={factor.label}
                            className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                              selectedCapriniFactors.includes(factor.label)
                                ? 'bg-amber-100 text-amber-900'
                                : 'hover:bg-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedCapriniFactors.includes(factor.label)}
                              onChange={() => toggleCapriniFactor(factor.label)}
                              className="w-4 h-4 rounded text-amber-600"
                            />
                            <span className="text-sm flex-1">{factor.label}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              factor.points >= 5 ? 'bg-red-200 text-red-800' :
                              factor.points >= 3 ? 'bg-orange-200 text-orange-800' :
                              factor.points >= 2 ? 'bg-amber-200 text-amber-800' :
                              'bg-blue-200 text-blue-800'
                            }`}>
                              +{factor.points}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* WHO Risk Factors */}
            <div className="card">
              <div className="card-header flex items-center gap-3">
                <Info className="w-5 h-5 text-blue-500" />
                <h2 className="font-semibold text-gray-900">WHO Surgical Risk Factors</h2>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {whoRiskFactors.map(factor => (
                    <label
                      key={factor}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        selectedRiskFactors.includes(factor)
                          ? 'bg-blue-100 text-blue-900'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRiskFactors.includes(factor)}
                        onChange={() => toggleRiskFactor(factor)}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="text-sm">{factor}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Mallampati Score */}
            <div className="card">
              <div className="card-header flex items-center gap-3">
                <Info className="w-5 h-5 text-purple-500" />
                <h2 className="font-semibold text-gray-900">Mallampati Score</h2>
              </div>
              <div className="card-body">
                <select {...register('mallampatiScore', { valueAsNumber: true })} className="input">
                  <option value="">Select score</option>
                  <option value="1">Class I - Soft palate, uvula, fauces, pillars visible</option>
                  <option value="2">Class II - Soft palate, uvula, fauces visible</option>
                  <option value="3">Class III - Soft palate, base of uvula visible</option>
                  <option value="4">Class IV - Hard palate only visible</option>
                </select>
              </div>
            </div>

            {/* Pre-Op Checklist */}
            <div className="card">
              <div className="card-header flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <h2 className="font-semibold text-gray-900">Pre-Operative Checklist</h2>
              </div>
              <div className="card-body space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" {...register('npoStatus')} className="w-5 h-5 rounded text-emerald-600" />
                  <div>
                    <span className="font-medium">NPO Status Confirmed</span>
                    <p className="text-sm text-gray-500">Patient has been nil per os as required</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" {...register('consentSigned')} className="w-5 h-5 rounded text-emerald-600" />
                  <div>
                    <span className="font-medium">Informed Consent Signed</span>
                    <p className="text-sm text-gray-500">Patient has signed surgical consent form</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" {...register('bloodTyped')} className="w-5 h-5 rounded text-emerald-600" />
                  <div>
                    <span className="font-medium">Blood Typed & Crossmatched</span>
                    <p className="text-sm text-gray-500">Blood products ready if needed</p>
                  </div>
                </label>

                {/* Downloadable Guidelines */}
                <div className="flex flex-col gap-3 mt-4 pt-4 border-t sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    onClick={() => {
                      if (patient && selectedProcedure) {
                        const scheduledDate = watch('scheduledDate');
                        // Calculate age from dateOfBirth
                        const patientAge = patient.dateOfBirth 
                          ? Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                          : undefined;
                        generatePreOpInstructionsPDF(
                          {
                            name: `${patient.firstName} ${patient.lastName}`,
                            hospitalNumber: patient.hospitalNumber || '',
                            age: patientAge,
                            gender: patient.gender,
                          },
                          {
                            procedureName: selectedProcedure.name,
                            procedureCode: selectedProcedure.icdCode,
                            scheduledDate: scheduledDate || new Date().toISOString().slice(0, 10),
                            scheduledTime: '08:00',
                            surgeon: user ? `${user.firstName} ${user.lastName}` : 'Attending Surgeon',
                            anaesthesiaType: anaesthesiaType || 'general',
                            asaScore: asaScore || 1,
                            hospitalName: 'AstroHEALTH Innovations in Healthcare',
                          }
                        );
                        toast.success('Fasting Guidelines PDF downloaded!');
                      } else {
                        toast.error('Please select a patient and procedure first');
                      }
                    }}
                  >
                    <Download size={16} />
                    Fasting Guidelines PDF
                  </button>
                  <button
                    type="button"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                    onClick={() => {
                      if (patient && selectedProcedure) {
                        const scheduledDate = watch('scheduledDate');
                        // Calculate age from dateOfBirth
                        const patientAge = patient.dateOfBirth 
                          ? Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                          : undefined;
                        generateConsentFormPDF(
                          {
                            name: `${patient.firstName} ${patient.lastName}`,
                            hospitalNumber: patient.hospitalNumber || '',
                            age: patientAge,
                            gender: patient.gender,
                          },
                          {
                            procedureName: selectedProcedure.name,
                            procedureCode: selectedProcedure.icdCode,
                            scheduledDate: scheduledDate || new Date().toISOString().slice(0, 10),
                            scheduledTime: '08:00',
                            surgeon: user ? `${user.firstName} ${user.lastName}` : 'Attending Surgeon',
                            anaesthesiaType: anaesthesiaType || 'general',
                            asaScore: asaScore || 1,
                            hospitalName: 'AstroHEALTH Innovations in Healthcare',
                          }
                        );
                        toast.success('Informed Consent Form PDF downloaded!');
                      } else {
                        toast.error('Please select a patient and procedure first');
                      }
                    }}
                  >
                    <FileText size={16} />
                    Informed Consent Form
                  </button>
                </div>

                <div>
                  <label className="label">Special Instructions</label>
                  <textarea
                    {...register('specialInstructions')}
                    rows={3}
                    className="input"
                    placeholder="Any special pre-operative instructions..."
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Investigations Tab */}
        {activeTab === 'investigations' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            {Object.entries(preOpInvestigations).map(([category, tests]) => (
              <div key={category} className="card">
                <div className="card-header flex items-center gap-3">
                  <Beaker className="w-5 h-5 text-teal-500" />
                  <h2 className="font-semibold text-gray-900 capitalize">{category}</h2>
                </div>
                <div className="card-body">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-gray-500 border-b">
                          <th className="pb-2">Investigation</th>
                          <th className="pb-2">Value</th>
                          <th className="pb-2">Unit</th>
                          <th className="pb-2">Normal Range</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {tests.map(test => {
                          const normalRange = patient?.gender === 'male' ? test.normalMale : test.normalFemale;
                          const result = investigationResults[test.name];
                          const status = result?.status || 'pending';
                          
                          return (
                            <tr key={test.name} className="text-sm">
                              <td className="py-3 font-medium text-gray-900">{test.name}</td>
                              <td className="py-3">
                                <input
                                  type="text"
                                  placeholder="Enter value"
                                  value={result?.value || ''}
                                  onChange={(e) => handleInvestigationChange(test.name, e.target.value, normalRange)}
                                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                              </td>
                              <td className="py-3 text-gray-500">{test.unit}</td>
                              <td className="py-3 text-gray-500 text-xs">
                                {normalRange}
                              </td>
                              <td className="py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  status === 'normal' ? 'bg-green-100 text-green-700' :
                                  status === 'abnormal' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {status === 'normal' ? 'Normal' : status === 'abnormal' ? 'Abnormal' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}

            <div>
              <label className="label">Additional Investigations</label>
              <textarea
                {...register('investigations')}
                rows={2}
                className="input"
                placeholder="Any additional investigations completed (comma separated)"
              />
            </div>
          </motion.div>
        )}

        {/* Surgical Team Tab */}
        {activeTab === 'team' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card"
          >
            <div className="card-header flex items-center gap-3">
              <Users className="w-5 h-5 text-indigo-500" />
              <h2 className="font-semibold text-gray-900">Surgical Team</h2>
            </div>
            <div className="card-body grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Primary Surgeon</label>
                <input
                  type="text"
                  value={user?.firstName + ' ' + user?.lastName}
                  disabled
                  className="input bg-gray-50"
                  title="Primary Surgeon"
                />
              </div>

              <div>
                <label className="label">Assistant Surgeon</label>
                <select
                  {...register('assistant')}
                  className="input"
                  title="Select assistant surgeon"
                >
                  <option value="">Select Assistant Surgeon</option>
                  {surgicalTeamMembers?.assistants
                    .filter(a => a.id !== user?.id)
                    .map(assistant => (
                      <option key={assistant.id} value={`${assistant.firstName} ${assistant.lastName}`}>
                        {assistant.firstName} {assistant.lastName} ({assistant.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="label">Anaesthetist</label>
                <select
                  {...register('anaesthetist')}
                  className="input"
                  title="Select anaesthetist"
                >
                  <option value="">Select Anaesthetist</option>
                  {surgicalTeamMembers?.anaesthetists.map(anaesthetist => (
                    <option key={anaesthetist.id} value={`${anaesthetist.firstName} ${anaesthetist.lastName}`}>
                      {anaesthetist.firstName} {anaesthetist.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Scrub Nurse</label>
                <select
                  {...register('scrubNurse')}
                  className="input"
                  title="Select scrub nurse"
                >
                  <option value="">Select Scrub Nurse</option>
                  {surgicalTeamMembers?.nurses.map(nurse => (
                    <option key={nurse.id} value={`${nurse.firstName} ${nurse.lastName}`}>
                      {nurse.firstName} {nurse.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Circulating Nurse</label>
                <select
                  {...register('circulatingNurse')}
                  className="input"
                  title="Select circulating nurse"
                >
                  <option value="">Select Circulating Nurse</option>
                  {surgicalTeamMembers?.nurses.map(nurse => (
                    <option key={nurse.id} value={`${nurse.firstName} ${nurse.lastName}`}>
                      {nurse.firstName} {nurse.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Fee Estimate Tab */}
        {activeTab === 'estimate' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="card">
              <div className="card-header flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-green-500" />
                <h2 className="font-semibold text-gray-900">Surgical Fee Estimate</h2>
              </div>
              <div className="card-body">
                {!selectedProcedure ? (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Please select a procedure in the Procedure Details tab to generate a fee estimate.</p>
                  </div>
                ) : feeEstimate ? (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Procedure Info */}
                    <div className={`p-4 rounded-lg ${complexityLevels[selectedProcedure.complexity].color}`}>
                      <h3 className="font-bold text-lg">{selectedProcedure.name}</h3>
                      <p className="text-sm opacity-80">ICD-10: {selectedProcedure.icdCode} | {selectedProcedure.complexityLabel}</p>
                    </div>

                    {/* Fee Breakdown - All Editable */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      {/* Surgeon's Fee */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b">
                        <label className="text-gray-600 flex-1">Surgeon's Professional Fee</label>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">₦</span>
                          <input
                            type="number"
                            value={customSurgeonFee ?? feeEstimate.surgeonFee}
                            onChange={(e) => setCustomSurgeonFee(Number(e.target.value))}
                            className="input w-32 text-right font-bold"
                            step={10000}
                            min={0}
                            title="Surgeon's Fee"
                          />
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 -mt-2 mb-2">
                        Range: {formatNaira(selectedProcedure.minFee)} - {formatNaira(selectedProcedure.maxFee)}
                      </div>

                      {/* Anaesthesia Fee */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b">
                        <label className="text-gray-600 flex-1">Anaesthesia Fee</label>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">₦</span>
                          <input
                            type="number"
                            value={customAnaesthesiaFee ?? feeEstimate.anaesthesiaFee}
                            onChange={(e) => setCustomAnaesthesiaFee(Number(e.target.value))}
                            className="input w-32 text-right font-bold"
                            step={10000}
                            min={0}
                            title="Anaesthesia Fee"
                          />
                        </div>
                      </div>

                      {/* Theatre Consumables */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b">
                        <label className="text-gray-600 flex-1">Theatre Consumables</label>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">₦</span>
                          <input
                            type="number"
                            value={customTheatreConsumables ?? feeEstimate.theatreConsumables}
                            onChange={(e) => setCustomTheatreConsumables(Number(e.target.value))}
                            className="input w-32 text-right font-bold"
                            step={10000}
                            min={0}
                            title="Theatre Consumables"
                          />
                        </div>
                      </div>

                      {/* Post-Op Medications */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b">
                        <label className="text-gray-600 flex-1">Post-Op Medications (Estimated)</label>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">₦</span>
                          <input
                            type="number"
                            value={customPostOpMedications ?? feeEstimate.postOpMedications}
                            onChange={(e) => setCustomPostOpMedications(Number(e.target.value))}
                            className="input w-32 text-right font-bold"
                            step={5000}
                            min={0}
                            title="Post-Op Medications"
                          />
                        </div>
                      </div>

                      {feeEstimate.histologyFee > 0 && (
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-gray-600">Histopathology Fee</span>
                          <span className="font-bold">{formatNaira(feeEstimate.histologyFee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-3 border-t-2 border-gray-300">
                        <span className="font-bold text-gray-900">Total Estimate</span>
                        <span className="font-bold text-xl text-green-600">{formatNaira(feeEstimate.totalEstimate)}</span>
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                          <p className="font-semibold mb-1">Important Notice</p>
                          <p>{feeEstimate.disclaimer}</p>
                        </div>
                      </div>
                    </div>

                    {/* Download Button */}
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      onClick={() => {
                        if (patient && selectedProcedure && feeEstimate) {
                          generateFeeEstimatePDF(
                            {
                              name: `${patient.firstName} ${patient.lastName}`,
                              hospitalNumber: patient.hospitalNumber,
                              age: patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined,
                              gender: patient.gender,
                            },
                            {
                              procedureName: selectedProcedure.name,
                              procedureCode: selectedProcedure.icdCode,
                              scheduledDate: watch('scheduledDate') || new Date().toISOString(),
                              surgeon: `${user?.firstName} ${user?.lastName}` || 'Attending Surgeon',
                              anaesthetist: watch('anaesthetist'),
                              anaesthesiaType: watch('anaesthesiaType'),
                              asaScore: watch('asaScore') || 1,
                              capriniScore: calculatedCapriniScore,
                              hospitalName: 'AstroHEALTH Innovations in Healthcare',
                            },
                            selectedProcedure,
                            feeEstimate
                          );
                          toast.success('Fee Estimate PDF downloaded!');
                        }
                      }}
                    >
                      <Download size={18} />
                      Download Fee Estimate PDF
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="card">
              <div className="card-header flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <h2 className="font-semibold text-gray-900">Surgical Documents</h2>
              </div>
              <div className="card-body">
                <p className="text-gray-600 mb-6">
                  Download pre-operative instructions, consent forms, and other important documents for this surgery.
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Pre-Op Instructions */}
                  <div className="border rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Pre-Operative Instructions</h3>
                        <p className="text-sm text-gray-600">Fasting guidelines, medication advice, and preparation checklist</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      onClick={() => {
                        if (patient) {
                          generatePreOpInstructionsPDF(
                            {
                              name: `${patient.firstName} ${patient.lastName}`,
                              hospitalNumber: patient.hospitalNumber,
                              age: patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined,
                              gender: patient.gender,
                            },
                            {
                              procedureName: selectedProcedure?.name || watch('procedureName') || 'Scheduled Procedure',
                              procedureCode: selectedProcedure?.icdCode || watch('procedureCode'),
                              scheduledDate: watch('scheduledDate') || new Date().toISOString(),
                              surgeon: `${user?.firstName} ${user?.lastName}` || 'Attending Surgeon',
                              anaesthetist: watch('anaesthetist'),
                              anaesthesiaType: watch('anaesthesiaType'),
                              asaScore: watch('asaScore') || 1,
                              capriniScore: calculatedCapriniScore,
                              hospitalName: 'AstroHEALTH Innovations in Healthcare',
                            }
                          );
                          toast.success('Pre-Operative Instructions PDF downloaded!');
                        } else {
                          toast.error('Please ensure patient information is loaded');
                        }
                      }}
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>

                  {/* Post-Op Instructions */}
                  <div className="border rounded-lg p-4 hover:border-green-300 hover:bg-green-50 transition-colors">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <FileText className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Post-Operative Instructions</h3>
                        <p className="text-sm text-gray-600">Recovery guidelines, wound care, and warning signs</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-2 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      onClick={() => {
                        if (patient) {
                          generatePostOpInstructionsPDF(
                            {
                              name: `${patient.firstName} ${patient.lastName}`,
                              hospitalNumber: patient.hospitalNumber,
                              age: patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined,
                              gender: patient.gender,
                            },
                            {
                              procedureName: selectedProcedure?.name || watch('procedureName') || 'Scheduled Procedure',
                              procedureCode: selectedProcedure?.icdCode || watch('procedureCode'),
                              scheduledDate: watch('scheduledDate') || new Date().toISOString(),
                              surgeon: `${user?.firstName} ${user?.lastName}` || 'Attending Surgeon',
                              anaesthetist: watch('anaesthetist'),
                              anaesthesiaType: watch('anaesthesiaType'),
                              asaScore: watch('asaScore') || 1,
                              capriniScore: calculatedCapriniScore,
                              hospitalName: 'AstroHEALTH Innovations in Healthcare',
                            }
                          );
                          toast.success('Post-Operative Instructions PDF downloaded!');
                        } else {
                          toast.error('Please ensure patient information is loaded');
                        }
                      }}
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>

                  {/* Consent Form */}
                  <div className="border rounded-lg p-4 hover:border-purple-300 hover:bg-purple-50 transition-colors">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <ClipboardCheck className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Consent Form</h3>
                        <p className="text-sm text-gray-600">Informed consent form for patient signature</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      onClick={() => {
                        if (patient) {
                          generateConsentFormPDF(
                            {
                              name: `${patient.firstName} ${patient.lastName}`,
                              hospitalNumber: patient.hospitalNumber,
                              age: patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined,
                              gender: patient.gender,
                              address: patient.address,
                            },
                            {
                              procedureName: selectedProcedure?.name || watch('procedureName') || 'Scheduled Procedure',
                              procedureCode: selectedProcedure?.icdCode || watch('procedureCode'),
                              scheduledDate: watch('scheduledDate') || new Date().toISOString(),
                              surgeon: `${user?.firstName} ${user?.lastName}` || 'Attending Surgeon',
                              anaesthetist: watch('anaesthetist'),
                              anaesthesiaType: watch('anaesthesiaType'),
                              asaScore: watch('asaScore') || 1,
                              capriniScore: calculatedCapriniScore,
                              hospitalName: 'AstroHEALTH Innovations in Healthcare',
                            }
                          );
                          toast.success('Consent Form PDF downloaded!');
                        } else {
                          toast.error('Please ensure patient information is loaded');
                        }
                      }}
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>

                  {/* Patient Counseling / Education */}
                  <div className="border rounded-lg p-4 hover:border-teal-300 hover:bg-teal-50 transition-colors">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <BookOpen className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Patient Counseling</h3>
                        <p className="text-sm text-gray-600">Comprehensive education document with aims, risks, complications & responsibilities</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
                        selectedProcedure
                          ? 'bg-teal-600 text-white hover:bg-teal-700' 
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                      disabled={!selectedProcedure}
                      onClick={() => {
                        if (patient && selectedProcedure) {
                          const education = getProcedureEducation(selectedProcedure.name);
                          if (education) {
                            generatePatientCounselingPDF({
                              patient: patient,
                              procedure: education,
                              surgeonName: `${user?.firstName} ${user?.lastName}` || 'Attending Surgeon',
                              surgeonLicense: user?.licenseNumber,
                              hospitalName: 'AstroHEALTH Innovations in Healthcare',
                              scheduledDate: watch('scheduledDate') ? new Date(watch('scheduledDate')) : undefined,
                              includeConsentSection: true,
                            });
                            toast.success('Patient Counseling PDF downloaded!');
                          } else {
                            toast.error('No counseling information available for this procedure');
                          }
                        } else {
                          toast.error('Please select a procedure first');
                        }
                      }}
                    >
                      <Download size={16} />
                      Download Counseling
                    </button>
                  </div>

                  {/* Fee Estimate */}
                  <div className="border rounded-lg p-4 hover:border-amber-300 hover:bg-amber-50 transition-colors">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <DollarSign className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Fee Estimate</h3>
                        <p className="text-sm text-gray-600">Detailed cost breakdown and payment terms</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
                        selectedProcedure && feeEstimate 
                          ? 'bg-amber-600 text-white hover:bg-amber-700' 
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                      disabled={!selectedProcedure || !feeEstimate}
                      onClick={() => {
                        if (patient && selectedProcedure && feeEstimate) {
                          generateFeeEstimatePDF(
                            {
                              name: `${patient.firstName} ${patient.lastName}`,
                              hospitalNumber: patient.hospitalNumber,
                              age: patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined,
                              gender: patient.gender,
                            },
                            {
                              procedureName: selectedProcedure.name,
                              procedureCode: selectedProcedure.icdCode,
                              scheduledDate: watch('scheduledDate') || new Date().toISOString(),
                              surgeon: `${user?.firstName} ${user?.lastName}` || 'Attending Surgeon',
                              anaesthetist: watch('anaesthetist'),
                              anaesthesiaType: watch('anaesthesiaType'),
                              asaScore: watch('asaScore') || 1,
                              capriniScore: calculatedCapriniScore,
                              hospitalName: 'AstroHEALTH Innovations in Healthcare',
                            },
                            selectedProcedure,
                            feeEstimate
                          );
                          toast.success('Fee Estimate PDF downloaded!');
                        }
                      }}
                    >
                      <Download size={16} />
                      {selectedProcedure ? 'Download' : 'Select Procedure First'}
                    </button>
                  </div>
                </div>

                {/* Info Note */}
                <div className="mt-6 p-4 bg-sky-50 border border-sky-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-sky-800">
                      <p className="font-semibold mb-1">Document Information</p>
                      <p>These documents follow WHO-aligned clinical protocols and are designed for Nigerian healthcare settings. Please review each document before providing to patients.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          {/* Section Progress */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Progress:</span>
            <div className="flex gap-1">
              {Object.entries(sectionCompletion).map(([key, completed]) => (
                <div
                  key={key}
                  className={`w-6 h-2 rounded ${completed ? 'bg-green-500' : 'bg-gray-200'}`}
                  title={`${key}: ${completed ? 'Complete' : 'Pending'}`}
                />
              ))}
            </div>
            <span className="text-xs">
              ({Object.values(sectionCompletion).filter(Boolean).length}/6 sections)
            </span>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              type="button"
              onClick={() => navigate(`/patients/${patientId}`)}
              className="btn btn-secondary w-full sm:w-auto"
            >
              Cancel
            </button>
            
            {/* Save Current Section Button */}
            <button
              type="button"
              onClick={getSectionSaveFunction()}
              disabled={isLoading}
              className="btn btn-outline border-purple-500 text-purple-600 hover:bg-purple-50 w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save {activeTab === 'details' ? 'Details' : 
                        activeTab === 'assessment' ? 'Assessment' :
                        activeTab === 'investigations' ? 'Investigations' :
                        activeTab === 'team' ? 'Team' :
                        activeTab === 'estimate' ? 'Estimate' : 'Checklist'}
                </>
              )}
            </button>

            {/* Final Submit - only show when all sections are complete or on last tab */}
            {(Object.values(sectionCompletion).filter(Boolean).length >= 2 || activeTab === 'documents') && (
              <button
                type="submit"
                disabled={isLoading || !sectionCompletion.details}
                className="btn btn-primary w-full sm:w-auto"
                title={!sectionCompletion.details ? 'Save Procedure Details first' : ''}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    {surgeryId ? 'Finalize Surgery' : 'Schedule Surgery'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
