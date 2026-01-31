import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  ClipboardList, 
  Search, 
  User, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  FileText,
  Calculator,
  ChevronDown,
  ChevronUp,
  Info,
  Printer,
  Share2,
  Clock,
  Stethoscope,
  Heart,
  XCircle,
  Plus,
  Minus,
  Building2,
  FlaskConical,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  CalendarCheck,
} from 'lucide-react';
import { differenceInYears } from 'date-fns';
import toast from 'react-hot-toast';

import { db } from '../../../database';
import type { Patient } from '../../../types';
import type { 
  SurgicalUrgency, 
  AnaesthesiaType, 
  ASAClass, 
  ComorbidityCategory,
  ProcedureCategory,
  OptimizationRecommendation,
  PreoperativeAssessment,
  InvestigationType,
} from '../types';
import { 
  COMORBIDITY_PROTOCOLS, 
  generateInvestigationList,
  getProtocolForComorbidity,
  suggestASAClass,
} from '../data/protocols';
import { getProcedureEducation, type ProcedureEducation } from '../../../data/patientEducation';
import { downloadPreoperativeAssessmentPDF, generatePreoperativeAssessmentPDF } from '../utils/preoperativePdfGenerator';
import { sharePDFOnWhatsApp } from '../../../utils/whatsappShareUtils';
import { useAuth } from '../../../contexts/AuthContext';
import { HospitalSelector } from '../../../components/hospital';

// Investigation result entry type
interface InvestigationResultEntry {
  type: InvestigationType;
  value: string;
  unit: string;
  isAbnormal: boolean;
  withinSafeRange: boolean;
  interpretation: string;
}

// Surgical readiness assessment
interface SurgicalReadinessAssessment {
  overallStatus: 'ready' | 'needs_optimization' | 'not_ready' | 'incomplete';
  score: number;
  maxScore: number;
  mandatoryMet: boolean;
  abnormalFindings: string[];
  optimizationRequired: string[];
  canProceed: boolean;
  recommendations: string[];
}

// ============================================================
// COMPONENT: PreoperativePlanningPage
// ============================================================

const PreoperativePlanningPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State for patient selection
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientList, setShowPatientList] = useState(false);

  // State for hospital selection
  const [selectedHospitalId, setSelectedHospitalId] = useState('');

  // State for planned procedure
  const [plannedProcedure, setPlannedProcedure] = useState('');
  const [procedureCategory, setProcedureCategory] = useState<ProcedureCategory>('intermediate');

  // State for surgical urgency and anaesthesia
  const [surgicalUrgency, setSurgicalUrgency] = useState<SurgicalUrgency>('elective');
  const [anaesthesiaType, setAnaesthesiaType] = useState<AnaesthesiaType>('general');

  // State for comorbidities
  const [selectedComorbidities, setSelectedComorbidities] = useState<ComorbidityCategory[]>(['none']);
  const [customNotes, setCustomNotes] = useState('');

  // State for ASA class
  const [asaClass, setAsaClass] = useState<ASAClass>('I');

  // State for investigation results entry
  const [investigationResults, setInvestigationResults] = useState<Record<InvestigationType, InvestigationResultEntry>>({} as Record<InvestigationType, InvestigationResultEntry>);
  
  // State for UI
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    investigations: true,
    optimizations: true,
    redFlags: false,
    anaesthesia: false,
    education: true,
    analysis: true,
  });

  // Fetch patients for search
  const patients = useLiveQuery(
    () => searchTerm.trim().length >= 2
      ? db.patients
          .filter(p => 
            p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.hospitalNumber?.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .limit(10)
          .toArray()
      : [],
    [searchTerm]
  );

  // Calculate patient age
  const patientAge = useMemo(() => {
    if (!selectedPatient?.dateOfBirth) return 0;
    return differenceInYears(new Date(), new Date(selectedPatient.dateOfBirth));
  }, [selectedPatient]);

  // Check if female of reproductive age
  const isFemaleReproductiveAge = useMemo(() => {
    if (!selectedPatient) return false;
    return selectedPatient.gender === 'female' && patientAge >= 15 && patientAge <= 50;
  }, [selectedPatient, patientAge]);

  // Auto-suggest ASA class based on comorbidities
  useEffect(() => {
    const suggested = suggestASAClass(selectedComorbidities);
    setAsaClass(suggested as ASAClass);
  }, [selectedComorbidities]);

  // Generate investigation list based on selections
  const requiredInvestigations = useMemo(() => {
    return generateInvestigationList(
      selectedComorbidities,
      procedureCategory,
      anaesthesiaType,
      patientAge,
      isFemaleReproductiveAge
    );
  }, [selectedComorbidities, procedureCategory, anaesthesiaType, patientAge, isFemaleReproductiveAge]);

  // Collect all optimization recommendations from selected comorbidities
  const allOptimizations = useMemo(() => {
    const optimizations: OptimizationRecommendation[] = [];
    selectedComorbidities.forEach(comorbidity => {
      const protocol = getProtocolForComorbidity(comorbidity);
      if (protocol) {
        optimizations.push(...protocol.optimizations);
      }
    });
    return optimizations;
  }, [selectedComorbidities]);

  // Collect all red flags from selected comorbidities
  const allRedFlags = useMemo(() => {
    const redFlags: string[] = [];
    selectedComorbidities.forEach(comorbidity => {
      const protocol = getProtocolForComorbidity(comorbidity);
      if (protocol?.redFlags) {
        redFlags.push(...protocol.redFlags);
      }
    });
    return [...new Set(redFlags)];
  }, [selectedComorbidities]);

  // Collect anaesthesia considerations
  const allAnaesthesiaConsiderations = useMemo(() => {
    const considerations: string[] = [];
    selectedComorbidities.forEach(comorbidity => {
      const protocol = getProtocolForComorbidity(comorbidity);
      if (protocol?.anaesthesiaConsiderations) {
        considerations.push(...protocol.anaesthesiaConsiderations);
      }
    });
    return [...new Set(considerations)];
  }, [selectedComorbidities]);

  // Find patient education for procedure
  const patientEducation = useMemo((): ProcedureEducation | null => {
    if (!plannedProcedure) return null;
    return getProcedureEducation(plannedProcedure) || null;
  }, [plannedProcedure]);

  // Normal ranges for investigations (WHO/clinical standards)
  const normalRanges: Record<InvestigationType, { min: number; max: number; unit: string; criticalMin?: number; criticalMax?: number }> = {
    fbc: { min: 10, max: 17, unit: 'g/dL', criticalMin: 7, criticalMax: 20 }, // Hemoglobin
    electrolytes: { min: 135, max: 145, unit: 'mmol/L', criticalMin: 120, criticalMax: 160 }, // Sodium
    renal_function: { min: 0.6, max: 1.2, unit: 'mg/dL', criticalMin: 0, criticalMax: 4 }, // Creatinine
    liver_function: { min: 0, max: 40, unit: 'U/L', criticalMin: 0, criticalMax: 200 }, // ALT
    coagulation: { min: 11, max: 13.5, unit: 'seconds', criticalMin: 0, criticalMax: 25 }, // PT
    blood_glucose: { min: 70, max: 140, unit: 'mg/dL', criticalMin: 40, criticalMax: 400 },
    hba1c: { min: 4, max: 7, unit: '%', criticalMin: 0, criticalMax: 12 },
    urinalysis: { min: 0, max: 0, unit: 'normal' }, // Qualitative
    ecg: { min: 60, max: 100, unit: 'bpm', criticalMin: 40, criticalMax: 150 },
    chest_xray: { min: 0, max: 0, unit: 'normal' }, // Qualitative
    abg: { min: 7.35, max: 7.45, unit: 'pH', criticalMin: 7.1, criticalMax: 7.6 },
    lactate: { min: 0.5, max: 2.2, unit: 'mmol/L', criticalMin: 0, criticalMax: 4 },
    blood_group: { min: 0, max: 0, unit: 'type' }, // Qualitative
    pregnancy_test: { min: 0, max: 0, unit: 'result' }, // Qualitative
    sickling_test: { min: 0, max: 0, unit: 'result' }, // Qualitative
    thyroid_function: { min: 0.4, max: 4.0, unit: 'mIU/L', criticalMin: 0.1, criticalMax: 10 }, // TSH
    cardiac_enzymes: { min: 0, max: 0.04, unit: 'ng/mL', criticalMin: 0, criticalMax: 0.4 }, // Troponin
    bnp: { min: 0, max: 100, unit: 'pg/mL', criticalMin: 0, criticalMax: 400 },
    echo: { min: 50, max: 70, unit: '%', criticalMin: 30, criticalMax: 100 }, // Ejection fraction
    pulmonary_function: { min: 80, max: 120, unit: '%', criticalMin: 50, criticalMax: 150 }, // FEV1
  };

  // Analyze investigation results
  const analyzeInvestigationResult = (type: InvestigationType, value: string): { isAbnormal: boolean; withinSafeRange: boolean; interpretation: string } => {
    const numValue = parseFloat(value);
    const range = normalRanges[type];
    
    if (!value || isNaN(numValue)) {
      return { isAbnormal: false, withinSafeRange: true, interpretation: 'Pending or qualitative result' };
    }

    // Qualitative tests
    if (['urinalysis', 'chest_xray', 'blood_group', 'pregnancy_test', 'sickling_test'].includes(type)) {
      const normalKeywords = ['normal', 'negative', 'clear', 'no abnormality'];
      const isNormal = normalKeywords.some(k => value.toLowerCase().includes(k));
      return {
        isAbnormal: !isNormal,
        withinSafeRange: isNormal,
        interpretation: isNormal ? 'Normal finding' : 'Abnormal - requires review'
      };
    }

    const isWithinNormal = numValue >= range.min && numValue <= range.max;
    const isWithinSafe = range.criticalMin !== undefined && range.criticalMax !== undefined
      ? numValue >= range.criticalMin && numValue <= range.criticalMax
      : isWithinNormal;

    let interpretation = '';
    if (isWithinNormal) {
      interpretation = 'Within normal limits - proceed';
    } else if (isWithinSafe) {
      interpretation = `Mildly abnormal (${numValue < range.min ? 'low' : 'high'}) - can proceed with caution`;
    } else {
      interpretation = `Critical value - requires optimization before surgery`;
    }

    return { isAbnormal: !isWithinNormal, withinSafeRange: isWithinSafe, interpretation };
  };

  // Update investigation result
  const updateInvestigationResult = (type: InvestigationType, value: string) => {
    const analysis = analyzeInvestigationResult(type, value);
    const range = normalRanges[type];
    
    setInvestigationResults(prev => ({
      ...prev,
      [type]: {
        type,
        value,
        unit: range.unit,
        ...analysis
      }
    }));
  };

  // Calculate surgical readiness assessment
  const surgicalReadiness = useMemo((): SurgicalReadinessAssessment => {
    const mandatoryInvestigations = requiredInvestigations.filter(inv => inv.requirement === 'mandatory');
    const recommendedInvestigations = requiredInvestigations.filter(inv => inv.requirement === 'recommended');
    
    // Check how many mandatory investigations have results
    const mandatoryWithResults = mandatoryInvestigations.filter(inv => 
      investigationResults[inv.type]?.value && investigationResults[inv.type]?.value.trim() !== ''
    );
    
    // Check how many are abnormal
    const abnormalFindings: string[] = [];
    const optimizationRequired: string[] = [];
    const recommendations: string[] = [];
    
    let score = 0;
    const maxScore = mandatoryInvestigations.length * 10 + recommendedInvestigations.length * 5;

    // Analyze mandatory investigations
    mandatoryInvestigations.forEach(inv => {
      const result = investigationResults[inv.type];
      if (result?.value) {
        if (!result.isAbnormal) {
          score += 10;
        } else if (result.withinSafeRange) {
          score += 5;
          abnormalFindings.push(`${inv.name}: ${result.value} ${result.unit} (mildly abnormal)`);
        } else {
          abnormalFindings.push(`${inv.name}: ${result.value} ${result.unit} (CRITICAL)`);
          optimizationRequired.push(`Correct ${inv.name.toLowerCase()} before surgery`);
        }
      }
    });

    // Analyze recommended investigations
    recommendedInvestigations.forEach(inv => {
      const result = investigationResults[inv.type];
      if (result?.value) {
        if (!result.isAbnormal) {
          score += 5;
        } else if (result.withinSafeRange) {
          score += 2;
        } else {
          abnormalFindings.push(`${inv.name}: ${result.value} ${result.unit}`);
        }
      }
    });

    // Determine overall status
    const mandatoryMet = mandatoryWithResults.length === mandatoryInvestigations.length &&
      mandatoryWithResults.every(inv => {
        const result = investigationResults[inv.type];
        return result?.withinSafeRange;
      });

    const hasCriticalAbnormality = mandatoryInvestigations.some(inv => {
      const result = investigationResults[inv.type];
      return result?.value && !result.withinSafeRange;
    });

    const hasIncompleteData = mandatoryWithResults.length < mandatoryInvestigations.length;

    let overallStatus: 'ready' | 'needs_optimization' | 'not_ready' | 'incomplete';
    let canProceed = false;

    if (hasIncompleteData) {
      overallStatus = 'incomplete';
      recommendations.push('Complete all mandatory investigations before assessment');
    } else if (hasCriticalAbnormality) {
      overallStatus = 'not_ready';
      recommendations.push('Critical abnormalities detected - surgery should be postponed');
      recommendations.push(...optimizationRequired);
    } else if (abnormalFindings.length > 0) {
      overallStatus = 'needs_optimization';
      canProceed = surgicalUrgency === 'emergency';
      recommendations.push('Minor abnormalities detected - proceed with monitoring');
      if (surgicalUrgency === 'elective') {
        recommendations.push('Consider optimization before elective surgery');
      }
    } else {
      overallStatus = 'ready';
      canProceed = true;
      recommendations.push('All investigations within acceptable limits');
      recommendations.push('Patient is cleared for surgery from investigation standpoint');
    }

    // Add urgency-based recommendations
    if (surgicalUrgency === 'emergency' && !canProceed && overallStatus !== 'incomplete') {
      recommendations.push('Emergency surgery: Proceed with concurrent resuscitation and optimization');
      canProceed = true;
    }

    return {
      overallStatus,
      score,
      maxScore,
      mandatoryMet,
      abnormalFindings,
      optimizationRequired,
      canProceed,
      recommendations
    };
  }, [investigationResults, requiredInvestigations, surgicalUrgency]);

  // Toggle comorbidity selection
  const toggleComorbidity = (category: ComorbidityCategory) => {
    setSelectedComorbidities(prev => {
      if (category === 'none') {
        return ['none'];
      }
      let newList = prev.filter(c => c !== 'none');
      if (newList.includes(category)) {
        newList = newList.filter(c => c !== category);
      } else {
        newList.push(category);
      }
      return newList.length === 0 ? ['none'] : newList;
    });
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Handle patient selection
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowPatientList(false);
    setSearchTerm(`${patient.firstName} ${patient.lastName}`);
  };

  // Build assessment object for PDF
  const buildAssessmentData = (): PreoperativeAssessment => ({
    id: '',
    patientId: selectedPatient?.id || '',
    hospitalId: selectedHospitalId,
    plannedProcedure: plannedProcedure,
    procedureCategory,
    surgicalUrgency,
    plannedAnaesthesia: anaesthesiaType,
    comorbidities: selectedComorbidities,
    asaClass,
    clinicalNotes: customNotes,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: user?.id || '',
    status: 'draft',
    requiredInvestigations: requiredInvestigations.map(inv => ({
      type: inv.type,
      requirement: inv.requirement,
      result: investigationResults[inv.type]?.value,
      isAbnormal: investigationResults[inv.type]?.isAbnormal,
      withinSafeRange: investigationResults[inv.type]?.withinSafeRange,
    })),
    optimizationPlan: allOptimizations.map(opt => ({
      recommendation: opt.recommendation,
      status: 'pending' as const,
    })),
    consentObtained: false,
    educationProvided: !!patientEducation,
    estimateCreated: false,
  });

  // Handle create surgical estimate
  const handleCreateEstimate = () => {
    if (!selectedPatient || !plannedProcedure) {
      toast.error('Please select a patient and enter a procedure');
      return;
    }
    // Navigate to billing with pre-filled data
    navigate(`/billing/estimate?patientId=${selectedPatient.id}&procedure=${encodeURIComponent(plannedProcedure)}`);
  };

  // Handle print/export
  const handlePrint = async () => {
    if (!selectedPatient || !plannedProcedure) {
      toast.error('Please select a patient and enter a procedure first');
      return;
    }

    const loadingToast = toast.loading('Generating PDF...');
    try {
      await downloadPreoperativeAssessmentPDF({
        patient: selectedPatient,
        assessment: buildAssessmentData(),
        investigations: requiredInvestigations,
        recommendations: allOptimizations,
        procedureEducation: patientEducation,
        hospitalName: 'AstroHEALTH Healthcare',
        generatedBy: user ? `${user.firstName} ${user.lastName}` : 'System',
      });
      toast.dismiss(loadingToast);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to generate PDF');
    }
  };

  // Handle WhatsApp share
  const handleWhatsAppShare = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    if (!plannedProcedure) {
      toast.error('Please enter a procedure first');
      return;
    }

    if (!selectedPatient.phone) {
      toast.error('No phone number available for this patient');
      return;
    }

    const loadingToast = toast.loading('Preparing document for WhatsApp...');
    try {
      const doc = await generatePreoperativeAssessmentPDF({
        patient: selectedPatient,
        assessment: buildAssessmentData(),
        investigations: requiredInvestigations,
        recommendations: allOptimizations,
        procedureEducation: patientEducation,
        hospitalName: 'AstroHEALTH Healthcare',
        generatedBy: user ? `${user.firstName} ${user.lastName}` : 'System',
      });

      const pdfBlob = doc.output('blob');
      const fileName = `Preoperative_${selectedPatient.firstName}_${plannedProcedure.replace(/\s+/g, '_')}.pdf`;
      
      await sharePDFOnWhatsApp(pdfBlob, fileName, selectedPatient.phone);
      toast.dismiss(loadingToast);
    } catch (error) {
      console.error('Error sharing PDF on WhatsApp:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to share on WhatsApp');
    }
  };

  // Requirement badge color
  const getRequirementBadgeColor = (requirement: string) => {
    switch (requirement) {
      case 'mandatory':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'recommended':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'if_indicated':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Priority badge color
  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'important':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Preoperative Planning</h1>
                <p className="text-sm text-gray-500">WHO-aligned perioperative optimization</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={handleWhatsAppShare}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <Share2 className="w-4 h-4" />
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Patient & Procedure Selection */}
          <div className="space-y-6">
            {/* Patient Selection */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Patient Selection
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or hospital number..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowPatientList(true);
                  }}
                  onFocus={() => setShowPatientList(true)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {showPatientList && patients && patients.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {patients.map(patient => (
                      <button
                        key={patient.id}
                        onClick={() => handleSelectPatient(patient)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                        <div className="text-sm text-gray-500">
                          {patient.hospitalNumber} • {patient.gender} • 
                          {patient.dateOfBirth && ` ${differenceInYears(new Date(), new Date(patient.dateOfBirth))} yrs`}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedPatient && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </div>
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    <p>Hospital #: {selectedPatient.hospitalNumber}</p>
                    <p>Age: {patientAge} years • {selectedPatient.gender}</p>
                    <p>Phone: {selectedPatient.phone || 'Not provided'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Hospital Selection */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Hospital / Facility
              </h2>
              <HospitalSelector
                value={selectedHospitalId}
                onChange={(id) => setSelectedHospitalId(id || '')}
                placeholder="Select hospital for surgery..."
                showAddNew={false}
              />
              {!selectedHospitalId && (
                <p className="text-xs text-amber-600 mt-2">
                  Please select the hospital where surgery will be performed
                </p>
              )}
            </div>

            {/* Planned Procedure */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Planned Procedure
              </h2>
              <input
                type="text"
                placeholder="Enter planned procedure..."
                value={plannedProcedure}
                onChange={(e) => setPlannedProcedure(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Procedure Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['minor', 'intermediate', 'major', 'super_major'] as ProcedureCategory[]).map(category => (
                    <button
                      key={category}
                      onClick={() => setProcedureCategory(category)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        procedureCategory === category
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {category.replace('_', ' ').charAt(0).toUpperCase() + category.replace('_', ' ').slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Surgical Urgency */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Surgical Urgency
              </h2>
              <div className="space-y-2">
                {(['elective', 'urgent', 'emergency'] as SurgicalUrgency[]).map(urgency => (
                  <button
                    key={urgency}
                    onClick={() => setSurgicalUrgency(urgency)}
                    className={`w-full px-4 py-3 rounded-lg text-left border transition-colors ${
                      surgicalUrgency === urgency
                        ? urgency === 'emergency' 
                          ? 'bg-red-100 border-red-500 text-red-800'
                          : urgency === 'urgent'
                          ? 'bg-orange-100 border-orange-500 text-orange-800'
                          : 'bg-green-100 border-green-500 text-green-800'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium capitalize">{urgency}</div>
                    <div className="text-xs mt-1 opacity-75">
                      {urgency === 'elective' && 'Full optimization required'}
                      {urgency === 'urgent' && 'Optimize where possible'}
                      {urgency === 'emergency' && 'Proceed with concurrent optimization'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Anaesthesia Type */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary" />
                Anaesthesia Type
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {(['local', 'sedation', 'spinal', 'epidural', 'general'] as AnaesthesiaType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setAnaesthesiaType(type)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      anaesthesiaType === type
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              {/* ASA Classification */}
              <div className="mt-4 pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ASA Physical Status
                </label>
                <select
                  value={asaClass}
                  onChange={(e) => setAsaClass(e.target.value as ASAClass)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  title="ASA Physical Status Classification"
                  aria-label="ASA Physical Status Classification"
                >
                  <option value="I">ASA I - Normal healthy patient</option>
                  <option value="II">ASA II - Mild systemic disease</option>
                  <option value="III">ASA III - Severe systemic disease</option>
                  <option value="IV">ASA IV - Life-threatening disease</option>
                  <option value="V">ASA V - Moribund patient</option>
                  <option value="VI">ASA VI - Brain-dead organ donor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Middle Column - Comorbidities */}
          <div className="space-y-6">
            {/* Comorbidity Selection */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Patient Comorbidities
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Select all applicable conditions
              </p>
              <div className="space-y-2">
                {COMORBIDITY_PROTOCOLS.map(protocol => (
                  <button
                    key={protocol.category}
                    onClick={() => toggleComorbidity(protocol.category)}
                    className={`w-full px-4 py-3 rounded-lg text-left border transition-colors ${
                      selectedComorbidities.includes(protocol.category)
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{protocol.name}</span>
                      {selectedComorbidities.includes(protocol.category) ? (
                        <Minus className="w-4 h-4" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </div>
                    <p className="text-xs mt-1 text-gray-500">{protocol.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Additional Notes</h2>
              <textarea
                placeholder="Any additional clinical notes..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-3">
              <button
                onClick={handleCreateEstimate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                <Calculator className="w-5 h-5" />
                Create Surgical Estimate
              </button>
              <button
                onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <FileText className="w-5 h-5" />
                Export Preoperative Plan
              </button>
            </div>
          </div>

          {/* Right Column - Investigations & Recommendations */}
          <div className="space-y-6">
            {/* Required Investigations */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection('investigations')}
                className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
              >
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Required Investigations ({requiredInvestigations.length})
                </h2>
                {expandedSections.investigations ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections.investigations && (
                <div className="p-4 space-y-3">
                  {requiredInvestigations.map((inv, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{inv.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{inv.rationale}</div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getRequirementBadgeColor(inv.requirement)}`}>
                          {inv.requirement.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-2 text-xs">
                        <span className="text-green-600">Expected: {inv.expectedValue}</span>
                        {inv.minSafeLevel && (
                          <span className="text-orange-600 ml-3">Min Safe: {inv.minSafeLevel}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Investigation Analysis & Results Entry */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection('analysis')}
                className="w-full px-6 py-4 flex items-center justify-between bg-indigo-50 hover:bg-indigo-100"
              >
                <h2 className="font-semibold text-indigo-900 flex items-center gap-2">
                  <FlaskConical className="w-5 h-5" />
                  Investigation Analysis & Results
                </h2>
                {expandedSections.analysis ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections.analysis && (
                <div className="p-4 space-y-4">
                  <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    Enter investigation results below to receive automated assessment and surgical clearance recommendations.
                  </p>
                  
                  {requiredInvestigations.map((inv, idx) => {
                    const result = investigationResults[inv.type];
                    const range = normalRanges[inv.type];
                    
                    return (
                      <div key={idx} className={`p-4 rounded-lg border-2 transition-colors ${
                        result?.value 
                          ? result.isAbnormal 
                            ? result.withinSafeRange 
                              ? 'border-yellow-300 bg-yellow-50' 
                              : 'border-red-300 bg-red-50'
                            : 'border-green-300 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              {inv.name}
                              {result?.value && (
                                result.isAbnormal ? (
                                  result.withinSafeRange ? (
                                    <TrendingUp className="w-4 h-4 text-yellow-600" />
                                  ) : (
                                    <TrendingDown className="w-4 h-4 text-red-600" />
                                  )
                                ) : (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                )
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              Normal: {range.min}-{range.max} {range.unit}
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getRequirementBadgeColor(inv.requirement)}`}>
                            {inv.requirement.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder={`Enter ${inv.name.toLowerCase()} result...`}
                            value={result?.value || ''}
                            onChange={(e) => updateInvestigationResult(inv.type, e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-500 min-w-[60px]">{range.unit}</span>
                        </div>
                        
                        {result?.value && (
                          <div className={`mt-2 text-sm p-2 rounded ${
                            result.isAbnormal
                              ? result.withinSafeRange
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {result.interpretation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Surgical Readiness Assessment */}
            {requiredInvestigations.length > 0 && (
              <div className={`rounded-xl shadow-lg overflow-hidden ${
                surgicalReadiness.overallStatus === 'ready' 
                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                  : surgicalReadiness.overallStatus === 'needs_optimization'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  : surgicalReadiness.overallStatus === 'not_ready'
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : 'bg-gradient-to-r from-gray-400 to-gray-500'
              }`}>
                <div className="p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      {surgicalReadiness.overallStatus === 'ready' ? (
                        <ThumbsUp className="w-6 h-6" />
                      ) : surgicalReadiness.overallStatus === 'incomplete' ? (
                        <AlertCircle className="w-6 h-6" />
                      ) : (
                        <ThumbsDown className="w-6 h-6" />
                      )}
                      Surgical Readiness Assessment
                    </h2>
                    <div className="text-right">
                      <div className="text-3xl font-bold">
                        {Math.round((surgicalReadiness.score / surgicalReadiness.maxScore) * 100) || 0}%
                      </div>
                      <div className="text-sm opacity-80">Readiness Score</div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4 ${
                    surgicalReadiness.overallStatus === 'ready' 
                      ? 'bg-white/20'
                      : surgicalReadiness.overallStatus === 'needs_optimization'
                      ? 'bg-white/20'
                      : surgicalReadiness.overallStatus === 'not_ready'
                      ? 'bg-white/20'
                      : 'bg-white/20'
                  }`}>
                    {surgicalReadiness.overallStatus === 'ready' && (
                      <>
                        <CalendarCheck className="w-4 h-4" />
                        CLEARED FOR SURGERY
                      </>
                    )}
                    {surgicalReadiness.overallStatus === 'needs_optimization' && (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        PROCEED WITH CAUTION
                      </>
                    )}
                    {surgicalReadiness.overallStatus === 'not_ready' && (
                      <>
                        <XCircle className="w-4 h-4" />
                        REQUIRES OPTIMIZATION
                      </>
                    )}
                    {surgicalReadiness.overallStatus === 'incomplete' && (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        INCOMPLETE DATA
                      </>
                    )}
                  </div>

                  {/* Abnormal Findings */}
                  {surgicalReadiness.abnormalFindings.length > 0 && (
                    <div className="mb-4 bg-white/10 rounded-lg p-3">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Abnormal Findings
                      </h3>
                      <ul className="space-y-1 text-sm">
                        {surgicalReadiness.abnormalFindings.map((finding, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  <div className="bg-white/10 rounded-lg p-3">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Recommendations
                    </h3>
                    <ul className="space-y-1 text-sm">
                      {surgicalReadiness.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Guidance */}
                  <div className="mt-4 pt-4 border-t border-white/20">
                    {surgicalReadiness.canProceed ? (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">
                          {surgicalUrgency === 'emergency' 
                            ? 'Emergency surgery may proceed with concurrent optimization'
                            : 'Patient may be scheduled for surgery'
                          }
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm">
                        <XCircle className="w-5 h-5" />
                        <span className="font-medium">
                          Complete investigations and address abnormalities before booking surgery
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Optimization Recommendations */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection('optimizations')}
                className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
              >
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Optimization Recommendations ({allOptimizations.length})
                </h2>
                {expandedSections.optimizations ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections.optimizations && (
                <div className="p-4 space-y-3">
                  {allOptimizations.map((opt, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="font-medium text-gray-900">{opt.category}</div>
                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityBadgeColor(opt.priority)}`}>
                          {opt.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{opt.recommendation}</p>
                      <div className="text-xs text-gray-400 mt-1">
                        Timing: {opt.timing.replace('_', ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Red Flags */}
            {allRedFlags.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection('redFlags')}
                  className="w-full px-6 py-4 flex items-center justify-between bg-red-50 hover:bg-red-100"
                >
                  <h2 className="font-semibold text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Red Flags to Watch ({allRedFlags.length})
                  </h2>
                  {expandedSections.redFlags ? <ChevronUp /> : <ChevronDown />}
                </button>
                {expandedSections.redFlags && (
                  <div className="p-4">
                    <ul className="space-y-2">
                      {allRedFlags.map((flag, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
                          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Anaesthesia Considerations */}
            {allAnaesthesiaConsiderations.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection('anaesthesia')}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
                >
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    Anaesthesia Considerations ({allAnaesthesiaConsiderations.length})
                  </h2>
                  {expandedSections.anaesthesia ? <ChevronUp /> : <ChevronDown />}
                </button>
                {expandedSections.anaesthesia && (
                  <div className="p-4">
                    <ul className="space-y-2">
                      {allAnaesthesiaConsiderations.map((consideration, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                          {consideration}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Patient Education */}
            {patientEducation && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection('education')}
                  className="w-full px-6 py-4 flex items-center justify-between bg-blue-50 hover:bg-blue-100"
                >
                  <h2 className="font-semibold text-blue-800 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Patient Education Available
                  </h2>
                  {expandedSections.education ? <ChevronUp /> : <ChevronDown />}
                </button>
                {expandedSections.education && (
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900">{patientEducation.procedureName}</h3>
                    <p className="text-sm text-gray-500 mt-1">{patientEducation.overview}</p>
                    <button
                      onClick={() => navigate(`/patient-education/${patientEducation.procedureId}`)}
                      className="mt-3 text-sm text-primary hover:underline"
                    >
                      View full education material →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreoperativePlanningPage;
