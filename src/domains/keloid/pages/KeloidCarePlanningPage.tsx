/**
 * Keloid Care Planning Page
 * AstroHEALTH Innovations in Healthcare
 * 
 * Comprehensive keloid management workflow:
 * - Clinical Summary
 * - Identified Problems & Concerns
 * - Risk Factors & Comorbidities
 * - Pre-Triamcinolone Tests
 * - Multi-Modality Treatment Planning
 * - PDF Export & Patient Sharing
 */

import { useState, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Save,
  Share2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  User,
  Calendar,
  ChevronDown,
  X,
  Heart,
  Shield,
  Syringe,
  Scissors,
  Activity,
  Eye,
  Trash2,
  Info,
  ClipboardList,
  Download,
  Stethoscope,
  Target,
  Zap,
  BookOpen,
  Printer,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { format, addWeeks, differenceInYears } from 'date-fns';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { HospitalSelector } from '../../../components/hospital';
import { generateKeloidCarePlanPDF, generateKeloidCarePlanPDFBlob, generateKeloidThermalPrintHTML } from '../utils/keloidPdfGenerator';
import { sharePDFOnWhatsApp } from '../../../utils/whatsappShareUtils';
import {
  KELOID_CONCERNS,
  KELOID_RISK_FACTORS,
  KELOID_LOCATIONS,
  COMORBIDITY_OPTIONS,
  PRE_TRIAMCINOLONE_TESTS,
  RADIOTHERAPY_INDICATIONS,
  RADIOTHERAPY_SIDE_EFFECTS,
  type KeloidCarePlan,
  type KeloidAssessment,
  type TriamcinoloneSchedule,
  type PreTriamcinoloneTestStatus,
} from '../types';

// ==================== FORM SCHEMA ====================

const keloidFormSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  hospitalId: z.string().min(1, 'Hospital is required'),
  clinicalSummary: z.string().min(10, 'Clinical summary is required (min 10 characters)'),
  diagnosisDate: z.string().optional(),
});

type KeloidFormData = z.infer<typeof keloidFormSchema>;

// ==================== COMPONENT ====================

export default function KeloidCarePlanningPage() {
  const { user } = useAuth();

  // UI State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<KeloidCarePlan | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [activeStep, setActiveStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State for creating/editing plans
  const [identifiedProblems, setIdentifiedProblems] = useState<string[]>([]);
  const [riskFactors, setRiskFactors] = useState<string[]>([]);
  const [comorbidities, setComorbidities] = useState<string[]>([]);
  const [hasNoComorbidities, setHasNoComorbidities] = useState(false);
  const [keloidAssessments, setKeloidAssessments] = useState<KeloidAssessment[]>([]);
  const [preTriamcinoloneTests, setPreTriamcinoloneTests] = useState<PreTriamcinoloneTestStatus[]>([]);
  
  // Treatment Plan State
  const [preOpEnabled, setPreOpEnabled] = useState(true);
  const [preOpSessions, setPreOpSessions] = useState(3);
  const [preOpStartDate, setPreOpStartDate] = useState('');
  const [surgeryPlanned, setSurgeryPlanned] = useState(true);
  const [surgeryDate, setSurgeryDate] = useState('');
  const [postOpEnabled, setPostOpEnabled] = useState(true);
  const [postOpSessions, setPostOpSessions] = useState(6);
  const [postOpStartDate, setPostOpStartDate] = useState('');
  const [siliconeStartDate, setSiliconeStartDate] = useState('');
  const [compressionStartDate, setCompressionStartDate] = useState('');
  const [siliconeWeeks, setSiliconeWeeks] = useState(24);
  const [radiotherapyIndicated, setRadiotherapyIndicated] = useState(false);
  const [selectedRadioIndications, setSelectedRadioIndications] = useState<string[]>([]);
  const [radiotherapyTiming, setRadiotherapyTiming] = useState('Within 24-72 hours post-surgery');
  const [multiModalityExplained, setMultiModalityExplained] = useState(false);
  const [complianceExplained, setComplianceExplained] = useState(false);
  const [consentObtained, setConsentObtained] = useState(false);
  const [otherConcerns, setOtherConcerns] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assessment form state
  const [newAssessment, setNewAssessment] = useState<Partial<KeloidAssessment>>({
    location: '',
    size: { length: 0, width: 0, height: 0, unit: 'cm' },
    duration: '',
    vascularity: 'moderate',
    firmness: 'firm',
    color: 'Pink/Red',
    symptoms: [],
  });

  // Data queries
  const patients = useLiveQuery(() => db.patients.filter(p => p.isActive === true).toArray(), []);
  const hospitals = useLiveQuery(() => db.hospitals.where('isActive').equals(1).toArray(), []);
  const keloidPlans = useLiveQuery(() => db.keloidCarePlans.reverse().sortBy('createdAt'), []);

  // Form
  const form = useForm<KeloidFormData>({
    resolver: zodResolver(keloidFormSchema),
    defaultValues: {
      hospitalId: user?.hospitalId || '',
    },
  });

  const selectedPatientId = form.watch('patientId');
  const selectedPatient = useMemo(() => {
    return patients?.find(p => p.id === selectedPatientId);
  }, [patients, selectedPatientId]);

  const patientAge = useMemo(() => {
    if (!selectedPatient?.dateOfBirth) return 0;
    return differenceInYears(new Date(), new Date(selectedPatient.dateOfBirth));
  }, [selectedPatient]);

  const isReproductiveAgeFemale = useMemo(() => {
    return selectedPatient?.gender === 'female' && patientAge >= 15 && patientAge <= 49;
  }, [selectedPatient, patientAge]);

  // Initialize pre-triamcinolone tests when patient is selected
  const initializeTests = useCallback(() => {
    const tests: PreTriamcinoloneTestStatus[] = PRE_TRIAMCINOLONE_TESTS
      .filter(test => {
        if (test.id === 'pregnancy') return isReproductiveAgeFemale;
        return true;
      })
      .map(test => ({
        testId: test.id,
        testName: test.name,
        status: 'required' as const,
      }));
    setPreTriamcinoloneTests(tests);
  }, [isReproductiveAgeFemale]);

  // Filtered plans
  const filteredPlans = useMemo(() => {
    if (!keloidPlans) return [];
    if (!searchQuery) return keloidPlans;
    const query = searchQuery.toLowerCase();
    return keloidPlans.filter(plan => {
      const patient = patients?.find(p => p.id === plan.patientId);
      const patientName = patient ? `${patient.firstName} ${patient.lastName}`.toLowerCase() : '';
      return patientName.includes(query) || plan.clinicalSummary?.toLowerCase().includes(query);
    });
  }, [keloidPlans, searchQuery, patients]);

  // Generate triamcinolone schedule
  const generateTriamcinoloneSchedule = (
    numSessions: number,
    startDate: string,
    phase: 'pre_op' | 'post_op'
  ): TriamcinoloneSchedule[] => {
    if (!startDate || numSessions <= 0) return [];
    const start = new Date(startDate);
    return Array.from({ length: numSessions }, (_, i) => ({
      id: uuidv4(),
      sessionNumber: i + 1,
      scheduledDate: addWeeks(start, i * 3),
      status: 'scheduled' as const,
      dose: '40mg/ml',
      concentration: '10-40mg/ml',
      phase,
    }));
  };

  // Steps for the creation wizard
  const steps = [
    { label: 'Clinical Summary', icon: FileText },
    { label: 'Assessment', icon: Target },
    { label: 'Problems & Risks', icon: AlertTriangle },
    { label: 'Pre-Treatment Tests', icon: Activity },
    { label: 'Treatment Plan', icon: Syringe },
    { label: 'Radiotherapy', icon: Zap },
    { label: 'Review & Save', icon: CheckCircle2 },
  ];

  // Handle adding keloid assessment
  const handleAddAssessment = () => {
    if (!newAssessment.location) {
      toast.error('Please select a keloid location');
      return;
    }
    setKeloidAssessments([...keloidAssessments, newAssessment as KeloidAssessment]);
    setNewAssessment({
      location: '',
      size: { length: 0, width: 0, height: 0, unit: 'cm' },
      duration: '',
      vascularity: 'moderate',
      firmness: 'firm',
      color: 'Pink/Red',
      symptoms: [],
    });
    toast.success('Keloid assessment added');
  };

  // Toggle test requirement
  const toggleTestRequirement = (testId: string) => {
    setPreTriamcinoloneTests(prev =>
      prev.map(t => t.testId === testId
        ? { ...t, status: t.status === 'not_required' ? 'required' : 'not_required' }
        : t
      )
    );
  };

  // Add a new custom test
  const [customTestName, setCustomTestName] = useState('');
  const handleAddCustomTest = () => {
    if (!customTestName.trim()) return;
    setPreTriamcinoloneTests(prev => [
      ...prev,
      {
        testId: uuidv4(),
        testName: customTestName.trim(),
        status: 'required' as const,
      },
    ]);
    setCustomTestName('');
    toast.success('Custom test added');
  };

  // Remove a test
  const handleRemoveTest = (testId: string) => {
    setPreTriamcinoloneTests(prev => prev.filter(t => t.testId !== testId));
  };

  // Submit handler
  const handleSubmit = async (data: KeloidFormData) => {
    if (!user) {
      toast.error('Please log in');
      return;
    }

    if (keloidAssessments.length === 0) {
      toast.error('Please add at least one keloid assessment');
      setActiveStep(1);
      return;
    }

    if (identifiedProblems.length === 0) {
      toast.error('Please identify at least one problem');
      setActiveStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      const plan: KeloidCarePlan = {
        id: uuidv4(),
        patientId: data.patientId,
        hospitalId: data.hospitalId,
        clinicalSummary: data.clinicalSummary,
        diagnosisDate: data.diagnosisDate ? new Date(data.diagnosisDate) : undefined,
        keloidAssessments,
        identifiedProblems,
        otherConcerns: otherConcerns || undefined,
        riskFactors,
        comorbidities: hasNoComorbidities ? ['None'] : comorbidities,
        hasNoComorbidities,
        preTriamcinoloneTests,
        patientGender: (selectedPatient?.gender as 'male' | 'female') || 'male',
        patientAge,
        allTestsCleared: preTriamcinoloneTests.every(t => t.status === 'completed' || t.status === 'not_required'),
        treatmentPlan: {
          preOpTriamcinolone: {
            enabled: preOpEnabled,
            numberOfSessions: preOpSessions,
            intervalWeeks: 3,
            schedule: preOpEnabled ? generateTriamcinoloneSchedule(preOpSessions, preOpStartDate, 'pre_op') : [],
            startDate: preOpStartDate ? new Date(preOpStartDate) : undefined,
          },
          surgery: {
            planned: surgeryPlanned,
            schedule: surgeryPlanned ? {
              plannedDate: surgeryDate ? new Date(surgeryDate) : undefined,
              status: 'planned',
              surgeryType: 'Keloid Excision',
            } : undefined,
          },
          postOpTriamcinolone: {
            enabled: postOpEnabled,
            numberOfSessions: postOpSessions,
            intervalWeeks: 3,
            schedule: postOpEnabled ? generateTriamcinoloneSchedule(postOpSessions, postOpStartDate, 'post_op') : [],
            startDate: postOpStartDate ? new Date(postOpStartDate) : undefined,
          },
          siliconeCompression: {
            siliconeSheetStartDate: siliconeStartDate ? new Date(siliconeStartDate) : undefined,
            compressionGarmentStartDate: compressionStartDate ? new Date(compressionStartDate) : undefined,
            siliconeInstructions: 'Apply silicone sheet/gel over the keloid area for minimum 12 hours/day. Clean and dry the area before application.',
            compressionInstructions: 'Wear compression garment continuously (23 hours/day, remove only for bathing). Ensure firm but comfortable fit.',
            durationWeeks: siliconeWeeks,
          },
          radiotherapy: {
            indicated: radiotherapyIndicated,
            indications: radiotherapyIndicated ? selectedRadioIndications : undefined,
            timing: radiotherapyTiming,
            sideEffectsDiscussed: radiotherapyIndicated,
            consentObtained: consentObtained,
          },
        },
        multiModalityExplained,
        complianceImportanceExplained: complianceExplained,
        patientConsentObtained: consentObtained,
        status: 'active',
        createdBy: user.id,
        createdByName: `${user.firstName} ${user.lastName}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.keloidCarePlans.add(plan as any);
      toast.success('Keloid Care Plan created successfully!');
      resetForm();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating keloid care plan:', error);
      toast.error('Failed to create care plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form validation errors — navigate to the step with the error
  const handleSubmitError = (errors: any) => {
    if (errors.patientId || errors.hospitalId || errors.clinicalSummary || errors.diagnosisDate) {
      setActiveStep(0);
      const firstError = errors.patientId?.message || errors.hospitalId?.message || errors.clinicalSummary?.message;
      if (firstError) toast.error(firstError);
      else toast.error('Please fill in the required fields in Clinical Summary');
    }
  };

  const resetForm = () => {
    form.reset();
    setIdentifiedProblems([]);
    setRiskFactors([]);
    setComorbidities([]);
    setHasNoComorbidities(false);
    setKeloidAssessments([]);
    setPreTriamcinoloneTests([]);
    setPreOpEnabled(true);
    setPreOpSessions(3);
    setPreOpStartDate('');
    setSurgeryPlanned(true);
    setSurgeryDate('');
    setPostOpEnabled(true);
    setPostOpSessions(6);
    setPostOpStartDate('');
    setSiliconeStartDate('');
    setCompressionStartDate('');
    setSiliconeWeeks(24);
    setRadiotherapyIndicated(false);
    setSelectedRadioIndications([]);
    setMultiModalityExplained(false);
    setComplianceExplained(false);
    setConsentObtained(false);
    setOtherConcerns('');
    setActiveStep(0);
  };

  // Handle PDF export (A4)
  const handleExportPDF = (plan: KeloidCarePlan) => {
    const patient = patients?.find(p => p.id === plan.patientId);
    const hospital = hospitals?.find(h => h.id === plan.hospitalId);
    if (!patient || !hospital) {
      toast.error('Patient or hospital data not found');
      return;
    }
    generateKeloidCarePlanPDF(plan, patient, hospital);
    toast.success('Keloid Care Plan A4 PDF generated');
  };

  // Handle WhatsApp Share
  const handleWhatsAppShare = async (plan: KeloidCarePlan) => {
    const patient = patients?.find(p => p.id === plan.patientId);
    const hospital = hospitals?.find(h => h.id === plan.hospitalId);
    if (!patient || !hospital) {
      toast.error('Patient or hospital data not found');
      return;
    }
    try {
      const { blob, fileName } = generateKeloidCarePlanPDFBlob(plan, patient, hospital);
      await sharePDFOnWhatsApp(blob, fileName);
    } catch (error) {
      console.error('Error sharing on WhatsApp:', error);
      toast.error('Failed to share on WhatsApp');
    }
  };

  // Handle Thermal Print (80mm, Font 12, Georgia)
  const handleThermalPrint = (plan: KeloidCarePlan) => {
    const patient = patients?.find(p => p.id === plan.patientId);
    const hospital = hospitals?.find(h => h.id === plan.hospitalId);
    if (!patient || !hospital) {
      toast.error('Patient or hospital data not found');
      return;
    }
    const html = generateKeloidThermalPrintHTML(plan, patient, hospital);
    const printWindow = window.open('', '_blank', 'width=320,height=800');
    if (!printWindow) {
      toast.error('Failed to open print window. Please allow popups.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
    toast.success('Thermal print window opened');
  };

  // View plan details
  const handleViewPlan = (plan: KeloidCarePlan) => {
    setSelectedPlan(plan);
    setViewMode('detail');
  };

  // ==================== RENDER ====================

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-primary-600" />
            Keloid Care Planning
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Comprehensive multi-modality keloid management
          </p>
        </div>
        
        <div className="flex gap-2">
          {viewMode === 'detail' && (
            <button
              onClick={() => { setViewMode('list'); setSelectedPlan(null); }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <ChevronDown size={16} className="rotate-90" />
              Back to List
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            New Care Plan
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="text-primary-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-primary-900">Multi-Modality Approach to Keloid Management</h3>
            <p className="text-sm text-primary-700 mt-1">
              Keloid management requires a comprehensive approach combining intralesional corticosteroid injections,
              surgical excision, post-operative steroid injections, silicone sheeting, compression therapy, 
              and in select cases, adjuvant low-dose radiotherapy. Patient compliance is critical for success.
            </p>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <ClipboardList className="text-primary-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{keloidPlans?.length || 0}</p>
                  <p className="text-xs text-gray-500">Total Plans</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {keloidPlans?.filter(p => p.status === 'active').length || 0}
                  </p>
                  <p className="text-xs text-gray-500">Active</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Syringe className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {keloidPlans?.filter(p => (p as any).treatmentPlan?.preOpTriamcinolone?.enabled).length || 0}
                  </p>
                  <p className="text-xs text-gray-500">On Triamcinolone</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Scissors className="text-amber-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {keloidPlans?.filter(p => (p as any).treatmentPlan?.surgery?.planned).length || 0}
                  </p>
                  <p className="text-xs text-gray-500">Surgery Planned</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="relative max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <Eye className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          {/* Plans List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {!filteredPlans || filteredPlans.length === 0 ? (
              <div className="p-12 text-center">
                <Shield className="mx-auto text-gray-300 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Keloid Care Plans</h3>
                <p className="text-gray-500">Create a new care plan to get started</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredPlans.map(plan => {
                  const patient = patients?.find(p => p.id === plan.patientId);
                  const treatmentPlan = plan.treatmentPlan as any;
                  return (
                    <div key={plan.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <User size={16} className="text-gray-400" />
                            <span className="font-semibold text-gray-900">
                              {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              plan.status === 'active' ? 'bg-green-100 text-green-700' :
                              plan.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                              plan.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{plan.clinicalSummary}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {format(new Date(plan.createdAt), 'dd MMM yyyy')}
                            </span>
                            <span>
                              Keloids: {(plan.keloidAssessments as any[])?.length || 0}
                            </span>
                            {treatmentPlan?.preOpTriamcinolone?.enabled && (
                              <span className="text-blue-600">
                                Pre-Op: {treatmentPlan.preOpTriamcinolone.numberOfSessions} sessions
                              </span>
                            )}
                            {treatmentPlan?.surgery?.planned && (
                              <span className="text-amber-600">Surgery Planned</span>
                            )}
                            {treatmentPlan?.radiotherapy?.indicated && (
                              <span className="text-purple-600">+ Radiotherapy</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewPlan(plan as any)}
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                            title="View details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleExportPDF(plan as any)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                            title="A4 PDF"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => handleWhatsAppShare(plan as any)}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            title="Share on WhatsApp"
                          >
                            <MessageCircle size={18} />
                          </button>
                          <button
                            onClick={() => handleThermalPrint(plan as any)}
                            className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                            title="Thermal Print (80mm)"
                          >
                            <Printer size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : selectedPlan ? (
        <PlanDetailView
          plan={selectedPlan}
          patient={patients?.find(p => p.id === selectedPlan.patientId)}
          hospital={hospitals?.find(h => h.id === selectedPlan.hospitalId)}
          onExportPDF={() => handleExportPDF(selectedPlan)}
          onWhatsAppShare={() => handleWhatsAppShare(selectedPlan)}
          onThermalPrint={() => handleThermalPrint(selectedPlan)}
        />
      ) : null}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary-50 to-blue-50">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Shield className="text-primary-600" />
                    New Keloid Care Plan
                  </h2>
                  <p className="text-sm text-gray-500">Step {activeStep + 1} of {steps.length}: {steps[activeStep].label}</p>
                </div>
                <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              {/* Step Indicator */}
              <div className="px-4 py-3 border-b bg-gray-50 overflow-x-auto">
                <div className="flex items-center gap-1 min-w-max">
                  {steps.map((step, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveStep(idx)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        idx === activeStep
                          ? 'bg-primary-600 text-white'
                          : idx < activeStep
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      <step.icon size={14} />
                      <span className="hidden sm:inline">{step.label}</span>
                      <span className="sm:hidden">{idx + 1}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step Content */}
              <form onSubmit={form.handleSubmit(handleSubmit, handleSubmitError)}>
                <div className="p-4 overflow-y-auto max-h-[calc(95vh-14rem)]">
                  {/* STEP 0: Clinical Summary */}
                  {activeStep === 0 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
                        <select
                          {...form.register('patientId')}
                          onChange={(e) => {
                            form.setValue('patientId', e.target.value);
                            initializeTests();
                          }}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select Patient</option>
                          {patients?.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.firstName} {p.lastName} ({p.hospitalNumber})
                            </option>
                          ))}
                        </select>
                        {form.formState.errors.patientId && (
                          <p className="text-red-500 text-xs mt-1">{form.formState.errors.patientId.message}</p>
                        )}
                      </div>

                      {selectedPatient && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">Name:</span>
                              <p className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Age:</span>
                              <p className="font-medium">{patientAge} years</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Gender:</span>
                              <p className="font-medium capitalize">{selectedPatient.gender}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Hospital No:</span>
                              <p className="font-medium">{selectedPatient.hospitalNumber}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hospital *</label>
                        <Controller
                          name="hospitalId"
                          control={form.control}
                          render={({ field }) => (
                            <HospitalSelector
                              value={field.value}
                              onChange={field.onChange}
                              error={form.formState.errors.hospitalId?.message}
                            />
                          )}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Diagnosis</label>
                        <input
                          type="date"
                          {...form.register('diagnosisDate')}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Summary *</label>
                        <textarea
                          {...form.register('clinicalSummary')}
                          rows={5}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                          placeholder="Provide a detailed clinical summary of the keloid presentation, history, and relevant clinical information..."
                        />
                        {form.formState.errors.clinicalSummary && (
                          <p className="text-red-500 text-xs mt-1">{form.formState.errors.clinicalSummary.message}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 1: Keloid Assessment */}
                  {activeStep === 1 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">Keloid Assessment</h3>
                      
                      {/* Existing assessments */}
                      {keloidAssessments.length > 0 && (
                        <div className="space-y-2">
                          {keloidAssessments.map((assess, idx) => (
                            <div key={idx} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                              <div>
                                <span className="font-medium">{assess.location}</span>
                                <span className="text-sm text-gray-500 ml-2">
                                  {assess.size.length}×{assess.size.width}×{assess.size.height} {assess.size.unit}
                                </span>
                                <span className="text-xs text-gray-400 ml-2">
                                  {assess.vascularity} vascularity, {assess.firmness}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setKeloidAssessments(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1 text-red-400 hover:text-red-600"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* New assessment form */}
                      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                        <h4 className="font-medium text-gray-700">Add Keloid</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Location</label>
                            <select
                              value={newAssessment.location || ''}
                              onChange={e => setNewAssessment(p => ({ ...p, location: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            >
                              <option value="">Select location</option>
                              {KELOID_LOCATIONS.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Duration</label>
                            <input
                              type="text"
                              value={newAssessment.duration || ''}
                              onChange={e => setNewAssessment(p => ({ ...p, duration: e.target.value }))}
                              placeholder="e.g., 2 years"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Length (cm)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={newAssessment.size?.length || ''}
                              onChange={e => setNewAssessment(p => ({ ...p, size: { ...p.size!, length: parseFloat(e.target.value) || 0 } }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Width (cm)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={newAssessment.size?.width || ''}
                              onChange={e => setNewAssessment(p => ({ ...p, size: { ...p.size!, width: parseFloat(e.target.value) || 0 } }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Height (cm)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={newAssessment.size?.height || ''}
                              onChange={e => setNewAssessment(p => ({ ...p, size: { ...p.size!, height: parseFloat(e.target.value) || 0 } }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Vascularity</label>
                            <select
                              value={newAssessment.vascularity || 'moderate'}
                              onChange={e => setNewAssessment(p => ({ ...p, vascularity: e.target.value as any }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            >
                              <option value="low">Low</option>
                              <option value="moderate">Moderate</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Firmness</label>
                            <select
                              value={newAssessment.firmness || 'firm'}
                              onChange={e => setNewAssessment(p => ({ ...p, firmness: e.target.value as any }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            >
                              <option value="soft">Soft</option>
                              <option value="firm">Firm</option>
                              <option value="hard">Hard</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Color</label>
                            <input
                              type="text"
                              value={newAssessment.color || ''}
                              onChange={e => setNewAssessment(p => ({ ...p, color: e.target.value }))}
                              placeholder="e.g., Pink/Red, Dark brown"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Symptoms</label>
                          <div className="flex flex-wrap gap-2">
                            {['Pain', 'Itching', 'Tenderness', 'Bleeding', 'Ulceration'].map(symptom => (
                              <label key={symptom} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm cursor-pointer hover:bg-gray-200">
                                <input
                                  type="checkbox"
                                  checked={newAssessment.symptoms?.includes(symptom) || false}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setNewAssessment(p => ({ ...p, symptoms: [...(p.symptoms || []), symptom] }));
                                    } else {
                                      setNewAssessment(p => ({ ...p, symptoms: (p.symptoms || []).filter(s => s !== symptom) }));
                                    }
                                  }}
                                  className="w-3 h-3"
                                />
                                {symptom}
                              </label>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddAssessment}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                        >
                          <Plus size={16} />
                          Add Keloid Assessment
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Problems, Risk Factors & Comorbidities */}
                  {activeStep === 2 && (
                    <div className="space-y-6">
                      {/* Identified Problems */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Identified Problems & Concerns</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {KELOID_CONCERNS.map(concern => (
                            <label key={concern} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                              <input
                                type="checkbox"
                                checked={identifiedProblems.includes(concern)}
                                onChange={e => {
                                  if (e.target.checked) setIdentifiedProblems(p => [...p, concern]);
                                  else setIdentifiedProblems(p => p.filter(c => c !== concern));
                                }}
                                className="w-4 h-4 text-primary-600 rounded"
                              />
                              <span className="text-sm">{concern}</span>
                            </label>
                          ))}
                        </div>
                        <div className="mt-3">
                          <label className="block text-xs text-gray-500 mb-1">Other Concerns</label>
                          <input
                            type="text"
                            value={otherConcerns}
                            onChange={e => setOtherConcerns(e.target.value)}
                            placeholder="Any other concerns..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      {/* Risk Factors */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Risk Factors</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {KELOID_RISK_FACTORS.map(factor => (
                            <label key={factor} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                              <input
                                type="checkbox"
                                checked={riskFactors.includes(factor)}
                                onChange={e => {
                                  if (e.target.checked) setRiskFactors(p => [...p, factor]);
                                  else setRiskFactors(p => p.filter(f => f !== factor));
                                }}
                                className="w-4 h-4 text-primary-600 rounded"
                              />
                              <span className="text-sm">{factor}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Comorbidities */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Comorbidities</h3>
                        <label className="flex items-center gap-2 mb-3 p-2 bg-green-50 rounded-lg cursor-pointer border border-green-200">
                          <input
                            type="checkbox"
                            checked={hasNoComorbidities}
                            onChange={e => {
                              setHasNoComorbidities(e.target.checked);
                              if (e.target.checked) setComorbidities([]);
                            }}
                            className="w-4 h-4 text-green-600 rounded"
                          />
                          <span className="text-sm font-medium text-green-700">No known comorbidities</span>
                        </label>
                        {!hasNoComorbidities && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {COMORBIDITY_OPTIONS.filter(c => c !== 'None').map(comorbidity => (
                              <label key={comorbidity} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                <input
                                  type="checkbox"
                                  checked={comorbidities.includes(comorbidity)}
                                  onChange={e => {
                                    if (e.target.checked) setComorbidities(p => [...p, comorbidity]);
                                    else setComorbidities(p => p.filter(c => c !== comorbidity));
                                  }}
                                  className="w-4 h-4 text-primary-600 rounded"
                                />
                                <span className="text-sm">{comorbidity}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Pre-Triamcinolone Tests */}
                  {activeStep === 3 && (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                          <div>
                            <h3 className="font-semibold text-amber-900">Pre-Triamcinolone Injection Tests</h3>
                            <p className="text-sm text-amber-700 mt-1">
                              The following tests are required before commencing intralesional triamcinolone therapy.
                              You can add or remove tests as clinically indicated.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Required Tests */}
                      <div className="space-y-2">
                        {preTriamcinoloneTests.map(test => (
                          <div key={test.testId} className={`flex items-center justify-between p-3 rounded-lg border ${
                            test.status === 'not_required' ? 'bg-gray-50 border-gray-200 opacity-60' :
                            test.status === 'completed' ? 'bg-green-50 border-green-200' :
                            'bg-white border-gray-200'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                test.status === 'completed' ? 'bg-green-500' :
                                test.status === 'not_required' ? 'bg-gray-300' :
                                'bg-amber-500'
                              }`} />
                              <div>
                                <span className="font-medium text-sm">{test.testName}</span>
                                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                                  test.status === 'required' ? 'bg-amber-100 text-amber-700' :
                                  test.status === 'ordered' ? 'bg-blue-100 text-blue-700' :
                                  test.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  'bg-gray-100 text-gray-500'
                                }`}>
                                  {test.status.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleTestRequirement(test.testId)}
                                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
                              >
                                {test.status === 'not_required' ? 'Mark Required' : 'Mark Not Required'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveTest(test.testId)}
                                className="p-1 text-red-400 hover:text-red-600"
                                title="Remove test"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Custom Test */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customTestName}
                          onChange={e => setCustomTestName(e.target.value)}
                          placeholder="Add custom test..."
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomTest}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm flex items-center gap-1"
                        >
                          <Plus size={14} />
                          Add Test
                        </button>
                      </div>

                      {isReproductiveAgeFemale && (
                        <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 flex items-start gap-2">
                          <Info className="text-pink-600 flex-shrink-0 mt-0.5" size={16} />
                          <p className="text-sm text-pink-700">
                            <strong>Note:</strong> Pregnancy test (UPT) is required for this patient as she is a female 
                            of reproductive age ({patientAge} years). Triamcinolone is contraindicated in pregnancy.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 4: Treatment Plan */}
                  {activeStep === 4 && (
                    <div className="space-y-6">
                      {/* Multi-modality info */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                          <BookOpen size={18} />
                          Multi-Modality Treatment Approach
                        </h3>
                        <p className="text-sm text-blue-700 mt-1">
                          Evidence shows that combining multiple treatment modalities (corticosteroid injections + surgery + 
                          post-op injections + silicone/compression) significantly reduces keloid recurrence rates compared 
                          to single-modality treatment.
                        </p>
                        <label className="flex items-center gap-2 mt-3">
                          <input
                            type="checkbox"
                            checked={multiModalityExplained}
                            onChange={e => setMultiModalityExplained(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-blue-800">Multi-modality approach explained to patient</span>
                        </label>
                        <label className="flex items-center gap-2 mt-2">
                          <input
                            type="checkbox"
                            checked={complianceExplained}
                            onChange={e => setComplianceExplained(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-blue-800">Importance of compliance discussed with patient</span>
                        </label>
                      </div>

                      {/* Pre-Op Triamcinolone */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Syringe size={18} className="text-blue-600" />
                            Pre-Operative Intralesional Triamcinolone
                          </h4>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={preOpEnabled}
                              onChange={e => setPreOpEnabled(e.target.checked)}
                              className="w-4 h-4 text-primary-600 rounded"
                            />
                            <span className="text-sm">Enable</span>
                          </label>
                        </div>
                        {preOpEnabled && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Number of Sessions</label>
                              <input
                                type="number"
                                min={1}
                                max={12}
                                value={preOpSessions}
                                onChange={e => setPreOpSessions(parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                              />
                              <p className="text-xs text-gray-400 mt-1">Given once every 3 weeks</p>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                              <input
                                type="date"
                                value={preOpStartDate}
                                onChange={e => setPreOpStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Interval</label>
                              <p className="text-sm text-gray-700 mt-2">Every 3 weeks (21 days)</p>
                            </div>
                          </div>
                        )}
                        {preOpEnabled && preOpStartDate && (
                          <div className="mt-3 bg-gray-50 rounded-lg p-3">
                            <h5 className="text-xs font-medium text-gray-500 mb-2">Projected Schedule:</h5>
                            <div className="flex flex-wrap gap-2">
                              {generateTriamcinoloneSchedule(preOpSessions, preOpStartDate, 'pre_op').map((s, i) => (
                                <span key={i} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                  Session {s.sessionNumber}: {format(s.scheduledDate, 'dd MMM yyyy')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Surgery */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Scissors size={18} className="text-amber-600" />
                            Surgical Excision
                          </h4>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={surgeryPlanned}
                              onChange={e => setSurgeryPlanned(e.target.checked)}
                              className="w-4 h-4 text-primary-600 rounded"
                            />
                            <span className="text-sm">Planned</span>
                          </label>
                        </div>
                        {surgeryPlanned && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Planned Surgery Date</label>
                            <input
                              type="date"
                              value={surgeryDate}
                              onChange={e => setSurgeryDate(e.target.value)}
                              className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>
                        )}
                      </div>

                      {/* Post-Op Triamcinolone */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Syringe size={18} className="text-green-600" />
                            Post-Operative Intralesional Triamcinolone
                          </h4>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={postOpEnabled}
                              onChange={e => setPostOpEnabled(e.target.checked)}
                              className="w-4 h-4 text-primary-600 rounded"
                            />
                            <span className="text-sm">Enable</span>
                          </label>
                        </div>
                        {postOpEnabled && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Number of Sessions</label>
                              <input
                                type="number"
                                min={1}
                                max={24}
                                value={postOpSessions}
                                onChange={e => setPostOpSessions(parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                              />
                              <p className="text-xs text-gray-400 mt-1">Given once every 3 weeks</p>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Start Date (post-surgery)</label>
                              <input
                                type="date"
                                value={postOpStartDate}
                                onChange={e => setPostOpStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Interval</label>
                              <p className="text-sm text-gray-700 mt-2">Every 3 weeks (21 days)</p>
                            </div>
                          </div>
                        )}
                        {postOpEnabled && postOpStartDate && (
                          <div className="mt-3 bg-gray-50 rounded-lg p-3">
                            <h5 className="text-xs font-medium text-gray-500 mb-2">Projected Schedule:</h5>
                            <div className="flex flex-wrap gap-2">
                              {generateTriamcinoloneSchedule(postOpSessions, postOpStartDate, 'post_op').map((s, i) => (
                                <span key={i} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                                  Session {s.sessionNumber}: {format(s.scheduledDate, 'dd MMM yyyy')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Silicone Sheet & Compression */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                          <Heart size={18} className="text-purple-600" />
                          Silicone Sheet & Compression Therapy
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Silicone Sheet Start Date</label>
                            <input
                              type="date"
                              value={siliconeStartDate}
                              onChange={e => setSiliconeStartDate(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Compression Therapy Start Date</label>
                            <input
                              type="date"
                              value={compressionStartDate}
                              onChange={e => setCompressionStartDate(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Duration (weeks)</label>
                            <input
                              type="number"
                              min={4}
                              max={52}
                              value={siliconeWeeks}
                              onChange={e => setSiliconeWeeks(parseInt(e.target.value) || 24)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                        <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700">
                          <p><strong>Silicone Instructions:</strong> Apply silicone sheet/gel over the keloid area for minimum 12 hours/day. Clean and dry the area before application.</p>
                          <p className="mt-1"><strong>Compression Instructions:</strong> Wear compression garment continuously (23 hours/day, remove only for bathing). Ensure firm but comfortable fit.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 5: Radiotherapy */}
                  {activeStep === 5 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <Zap size={18} className="text-purple-600" />
                          Post-Operative Low-Dose Radiotherapy
                        </h3>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={radiotherapyIndicated}
                            onChange={e => setRadiotherapyIndicated(e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <span className="text-sm font-medium">Radiotherapy Indicated</span>
                        </label>
                      </div>

                      {radiotherapyIndicated && (
                        <>
                          {/* Indications */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Indications</h4>
                            <div className="space-y-2">
                              {RADIOTHERAPY_INDICATIONS.map(indication => (
                                <label key={indication} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                  <input
                                    type="checkbox"
                                    checked={selectedRadioIndications.includes(indication)}
                                    onChange={e => {
                                      if (e.target.checked) setSelectedRadioIndications(p => [...p, indication]);
                                      else setSelectedRadioIndications(p => p.filter(i => i !== indication));
                                    }}
                                    className="w-4 h-4 text-purple-600 rounded"
                                  />
                                  <span className="text-sm">{indication}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Timing */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Timing</h4>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <p className="text-sm text-amber-800 font-medium">
                                ⏰ Recommended: Within 24-72 hours post-surgery
                              </p>
                              <p className="text-xs text-amber-700 mt-1">
                                Radiotherapy should ideally commence within 24 hours of keloid excision and no later than 72 hours 
                                to maximize efficacy. Delay beyond this window significantly increases recurrence risk.
                              </p>
                            </div>
                            <input
                              type="text"
                              value={radiotherapyTiming}
                              onChange={e => setRadiotherapyTiming(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mt-2"
                              placeholder="Specify timing..."
                            />
                          </div>

                          {/* Side Effects */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Side Effects to Anticipate & Management</h4>
                            <div className="space-y-2">
                              {RADIOTHERAPY_SIDE_EFFECTS.map((se, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{se.effect}</p>
                                      <p className="text-xs text-gray-500 mt-0.5">Timing: {se.timing}</p>
                                      <p className="text-xs text-green-700 mt-0.5">Management: {se.management}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {!radiotherapyIndicated && (
                        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                          <Zap className="mx-auto mb-3 text-gray-300" size={40} />
                          <p>Radiotherapy is not indicated for this patient</p>
                          <p className="text-xs mt-1">Check the box above if post-operative radiotherapy is needed</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 6: Review & Save */}
                  {activeStep === 6 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">Review Care Plan</h3>
                      
                      {/* Validation Warnings */}
                      {(!selectedPatient || !form.getValues('clinicalSummary') || keloidAssessments.length === 0 || identifiedProblems.length === 0) && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                            <div>
                              <h4 className="font-semibold text-red-900">Please complete the following before saving:</h4>
                              <ul className="mt-2 space-y-1 text-sm text-red-700">
                                {!selectedPatient && (
                                  <li className="cursor-pointer hover:underline" onClick={() => setActiveStep(0)}>
                                    ⚠ Select a patient (Step 1)
                                  </li>
                                )}
                                {!form.getValues('clinicalSummary') && (
                                  <li className="cursor-pointer hover:underline" onClick={() => setActiveStep(0)}>
                                    ⚠ Enter a clinical summary (Step 1)
                                  </li>
                                )}
                                {keloidAssessments.length === 0 && (
                                  <li className="cursor-pointer hover:underline" onClick={() => setActiveStep(1)}>
                                    ⚠ Add at least one keloid assessment (Step 2)
                                  </li>
                                )}
                                {identifiedProblems.length === 0 && (
                                  <li className="cursor-pointer hover:underline" onClick={() => setActiveStep(2)}>
                                    ⚠ Select at least one problem (Step 3)
                                  </li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-500">Patient:</span>
                            <p className="font-medium">
                              {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Not selected'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Keloids Assessed:</span>
                            <p className="font-medium">{keloidAssessments.length}</p>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Problems:</span>
                          <p className="font-medium">{identifiedProblems.join(', ') || 'None selected'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Comorbidities:</span>
                          <p className="font-medium">{hasNoComorbidities ? 'None' : comorbidities.join(', ') || 'None selected'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Pre-Treatment Tests:</span>
                          <p className="font-medium">{preTriamcinoloneTests.filter(t => t.status !== 'not_required').map(t => t.testName).join(', ')}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-500">Pre-Op Triamcinolone:</span>
                            <p className="font-medium">{preOpEnabled ? `${preOpSessions} sessions` : 'Not planned'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Surgery:</span>
                            <p className="font-medium">{surgeryPlanned ? (surgeryDate ? format(new Date(surgeryDate), 'dd MMM yyyy') : 'Date TBD') : 'Not planned'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Post-Op Triamcinolone:</span>
                            <p className="font-medium">{postOpEnabled ? `${postOpSessions} sessions` : 'Not planned'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Radiotherapy:</span>
                            <p className="font-medium">{radiotherapyIndicated ? 'Indicated' : 'Not indicated'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Consent */}
                      <div className="border-t pt-4">
                        <label className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={consentObtained}
                            onChange={e => setConsentObtained(e.target.checked)}
                            className="w-4 h-4 text-green-600 rounded"
                          />
                          <span className="text-sm font-medium text-green-800">
                            Patient has provided informed consent for the treatment plan
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                    disabled={activeStep === 0}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  <div className="flex gap-2">
                    {activeStep < steps.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setActiveStep(activeStep + 1)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save size={16} />
                            Create Care Plan
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== PLAN DETAIL VIEW ====================

function PlanDetailView({
  plan,
  patient,
  hospital: _hospital,
  onExportPDF,
  onWhatsAppShare,
  onThermalPrint,
}: {
  plan: KeloidCarePlan;
  patient: any;
  hospital: any;
  onExportPDF: () => void;
  onWhatsAppShare: () => void;
  onThermalPrint: () => void;
}) {
  const treatmentPlan = plan.treatmentPlan as any;

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Export & Share</h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onExportPDF}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
          >
            <Download size={16} />
            A4 PDF
          </button>
          <button
            onClick={onWhatsAppShare}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-sm"
          >
            <MessageCircle size={16} />
            WhatsApp
          </button>
          <button
            onClick={onThermalPrint}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center gap-2 text-sm"
          >
            <Printer size={16} />
            Thermal Print
          </button>
          <button
            onClick={() => {
              onExportPDF();
              toast.success('PDF ready to share with patient');
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm"
          >
            <Share2 size={16} />
            Share with Patient
          </button>
        </div>
      </div>

      {/* Patient Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <User size={18} className="text-primary-600" />
          Patient Information
        </h3>
        {/* Row 1: Core demographics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Name:</span>
            <p className="font-medium">{patient ? `${patient.firstName}${patient.middleName ? ` ${patient.middleName}` : ''} ${patient.lastName}` : 'Unknown'}</p>
          </div>
          <div>
            <span className="text-gray-500">Hospital No:</span>
            <p className="font-medium">{patient?.hospitalNumber || 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-500">Age / DOB:</span>
            <p className="font-medium">
              {plan.patientAge} years
              {patient?.dateOfBirth && <span className="text-gray-400 text-xs ml-1">({format(new Date(patient.dateOfBirth), 'dd MMM yyyy')})</span>}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Gender:</span>
            <p className="font-medium capitalize">{plan.patientGender}</p>
          </div>
        </div>

        {/* Row 2: Clinical identifiers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
          <div>
            <span className="text-gray-500">Blood Group:</span>
            <p className="font-medium">{patient?.bloodGroup || 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-500">Genotype:</span>
            <p className="font-medium">{patient?.genotype || 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-500">Marital Status:</span>
            <p className="font-medium capitalize">{patient?.maritalStatus || 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {plan.status}
            </span>
          </div>
        </div>

        {/* Row 3: Contact information */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
          <div>
            <span className="text-gray-500">Phone:</span>
            <p className="font-medium">{patient?.phone || 'N/A'}</p>
          </div>
          {patient?.alternatePhone && (
            <div>
              <span className="text-gray-500">Alt. Phone:</span>
              <p className="font-medium">{patient.alternatePhone}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500">Occupation:</span>
            <p className="font-medium capitalize">{patient?.occupation || 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-500">Address:</span>
            <p className="font-medium">{[patient?.address, patient?.city, patient?.state].filter(Boolean).join(', ') || 'N/A'}</p>
          </div>
        </div>

        {/* Row 4: Clinical flags */}
        {(patient?.allergies?.length > 0 || patient?.chronicConditions?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t border-gray-100">
            {patient?.allergies?.length > 0 && (
              <div>
                <span className="text-gray-500">Allergies:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {patient.allergies.map((a: string) => (
                    <span key={a} className="px-2 py-0.5 text-xs bg-red-50 text-red-700 rounded-full border border-red-200">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {patient?.chronicConditions?.length > 0 && (
              <div>
                <span className="text-gray-500">Chronic Conditions:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {patient.chronicConditions.map((c: string) => (
                    <span key={c} className="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded-full border border-amber-200">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Row 5: Next of Kin */}
        {patient?.nextOfKin?.name && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3 pt-3 border-t border-gray-100">
            <div>
              <span className="text-gray-500">Next of Kin:</span>
              <p className="font-medium">{patient.nextOfKin.name}</p>
            </div>
            <div>
              <span className="text-gray-500">Relationship:</span>
              <p className="font-medium capitalize">{patient.nextOfKin.relationship || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">NoK Phone:</span>
              <p className="font-medium">{patient.nextOfKin.phone || 'N/A'}</p>
            </div>
            {patient.nextOfKin.address && (
              <div>
                <span className="text-gray-500">NoK Address:</span>
                <p className="font-medium">{patient.nextOfKin.address}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clinical Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileText size={18} className="text-primary-600" />
          Clinical Summary
        </h3>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{plan.clinicalSummary}</p>
      </div>

      {/* Keloid Assessments */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Target size={18} className="text-primary-600" />
          Keloid Assessments ({(plan.keloidAssessments as any[])?.length || 0})
        </h3>
        <div className="space-y-3">
          {(plan.keloidAssessments as any[])?.map((assess: KeloidAssessment, idx: number) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-medium">{assess.location}</span>
                <span className="text-sm text-gray-500">
                  {assess.size.length}×{assess.size.width}×{assess.size.height} {assess.size.unit}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Vascularity: {assess.vascularity} | Firmness: {assess.firmness} | Color: {assess.color} | Duration: {assess.duration}
              </div>
              {assess.symptoms?.length > 0 && (
                <div className="mt-1 flex gap-1">
                  {assess.symptoms.map(s => (
                    <span key={s} className="px-2 py-0.5 text-xs bg-red-50 text-red-600 rounded">{s}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Problems & Comorbidities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Identified Problems</h3>
          <div className="flex flex-wrap gap-2">
            {plan.identifiedProblems?.map(p => (
              <span key={p} className="px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded-full border border-amber-200">{p}</span>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Comorbidities</h3>
          {plan.hasNoComorbidities ? (
            <span className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded-full border border-green-200">None</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {plan.comorbidities?.map(c => (
                <span key={c} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pre-Triamcinolone Tests */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Activity size={18} className="text-primary-600" />
          Pre-Triamcinolone Tests
        </h3>
        <div className="space-y-2">
          {(plan.preTriamcinoloneTests as any[])?.map((test: PreTriamcinoloneTestStatus) => (
            <div key={test.testId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">{test.testName}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                test.status === 'completed' ? 'bg-green-100 text-green-700' :
                test.status === 'not_required' ? 'bg-gray-100 text-gray-500' :
                'bg-amber-100 text-amber-700'
              }`}>
                {test.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Treatment Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Stethoscope size={18} className="text-primary-600" />
          Treatment Plan Timeline
        </h3>

        <div className="space-y-4">
          {/* Pre-Op Triamcinolone */}
          {treatmentPlan?.preOpTriamcinolone?.enabled && (
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium text-blue-700 flex items-center gap-2">
                <Syringe size={16} />
                Pre-Op Triamcinolone ({treatmentPlan.preOpTriamcinolone.numberOfSessions} sessions, q3 weekly)
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {treatmentPlan.preOpTriamcinolone.schedule?.map((s: TriamcinoloneSchedule) => (
                  <span key={s.id} className={`px-2 py-1 text-xs rounded ${
                    s.status === 'completed' ? 'bg-green-100 text-green-700' :
                    s.status === 'missed' ? 'bg-red-100 text-red-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    #{s.sessionNumber}: {format(new Date(s.scheduledDate), 'dd MMM')}
                    {s.status === 'completed' && ' ✓'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Surgery */}
          {treatmentPlan?.surgery?.planned && (
            <div className="border-l-4 border-amber-500 pl-4">
              <h4 className="font-medium text-amber-700 flex items-center gap-2">
                <Scissors size={16} />
                Surgical Excision
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {treatmentPlan.surgery.schedule?.plannedDate 
                  ? `Planned: ${format(new Date(treatmentPlan.surgery.schedule.plannedDate), 'dd MMM yyyy')}`
                  : 'Date TBD'
                }
              </p>
            </div>
          )}

          {/* Post-Op Triamcinolone */}
          {treatmentPlan?.postOpTriamcinolone?.enabled && (
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-medium text-green-700 flex items-center gap-2">
                <Syringe size={16} />
                Post-Op Triamcinolone ({treatmentPlan.postOpTriamcinolone.numberOfSessions} sessions, q3 weekly)
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {treatmentPlan.postOpTriamcinolone.schedule?.map((s: TriamcinoloneSchedule) => (
                  <span key={s.id} className={`px-2 py-1 text-xs rounded ${
                    s.status === 'completed' ? 'bg-green-100 text-green-700' :
                    'bg-green-50 text-green-700'
                  }`}>
                    #{s.sessionNumber}: {format(new Date(s.scheduledDate), 'dd MMM')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Silicone & Compression */}
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-medium text-purple-700 flex items-center gap-2">
              <Heart size={16} />
              Silicone Sheet & Compression Therapy
            </h4>
            <div className="text-sm text-gray-600 mt-1 space-y-1">
              {treatmentPlan?.siliconeCompression?.siliconeSheetStartDate && (
                <p>Silicone: from {format(new Date(treatmentPlan.siliconeCompression.siliconeSheetStartDate), 'dd MMM yyyy')}</p>
              )}
              {treatmentPlan?.siliconeCompression?.compressionGarmentStartDate && (
                <p>Compression: from {format(new Date(treatmentPlan.siliconeCompression.compressionGarmentStartDate), 'dd MMM yyyy')}</p>
              )}
              <p>Duration: {treatmentPlan?.siliconeCompression?.durationWeeks || 24} weeks</p>
            </div>
          </div>

          {/* Radiotherapy */}
          {treatmentPlan?.radiotherapy?.indicated && (
            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-medium text-red-700 flex items-center gap-2">
                <Zap size={16} />
                Low-Dose Radiotherapy
              </h4>
              <p className="text-sm text-gray-600 mt-1">Timing: {treatmentPlan.radiotherapy.timing}</p>
              {treatmentPlan.radiotherapy.indications?.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {treatmentPlan.radiotherapy.indications.map((ind: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 text-xs bg-red-50 text-red-700 rounded">{ind}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==================== PATIENT EDUCATION ==================== */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-base">
          <BookOpen size={20} className="text-blue-600" />
          Patient Education — Understanding Your Keloid Treatment
        </h3>

        {/* What is a Keloid */}
        <div className="mb-4">
          <h4 className="font-semibold text-gray-800 text-sm mb-1">What is a Keloid?</h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            A keloid is a type of raised scar that grows beyond the boundaries of the original wound or injury.
            Unlike normal scars, keloids continue to grow over time due to excessive collagen production.
            They can occur after surgery, burns, piercings, acne, or even minor skin injuries.
            Keloids are more common in people with darker skin tones and may run in families.
            They are benign (non-cancerous) but can cause pain, itching, tenderness, and cosmetic concern.
          </p>
        </div>

        {/* Why Multi-Modality */}
        <div className="mb-4 bg-white/60 rounded-lg p-3 border border-blue-100">
          <h4 className="font-semibold text-blue-800 text-sm mb-1">Why Multiple Treatments Are Needed</h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            Keloids have a high recurrence rate (up to 50-80%) when treated with surgery alone.
            Research shows that combining multiple treatment modalities significantly reduces recurrence rates to 10-20%.
            Your care plan uses a multi-modality approach tailored to your specific keloid characteristics, combining
            {[
              treatmentPlan?.preOpTriamcinolone?.enabled && ' steroid injections (pre-operative)',
              treatmentPlan?.surgery?.planned && ' surgical excision',
              treatmentPlan?.postOpTriamcinolone?.enabled && ' steroid injections (post-operative)',
              ' silicone sheet and compression therapy',
              treatmentPlan?.radiotherapy?.indicated && ' low-dose radiotherapy',
            ].filter(Boolean).join(',')}
            {' '}for the best possible outcome.
          </p>
        </div>

        {/* Treatment-specific education - only show sections relevant to the patient's plan */}
        <div className="space-y-3">
          {/* Triamcinolone Education */}
          {(treatmentPlan?.preOpTriamcinolone?.enabled || treatmentPlan?.postOpTriamcinolone?.enabled) && (
            <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
              <h4 className="font-semibold text-blue-800 text-sm mb-1 flex items-center gap-1">
                <Syringe size={14} /> Triamcinolone (Steroid) Injections
              </h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
                <li><strong>What it does:</strong> Triamcinolone acetonide is a corticosteroid injected directly into the keloid. It reduces collagen production, softens the scar, and decreases inflammation.</li>
                <li><strong>Frequency:</strong> Injections are given every 3 weeks (q3 weekly) to allow the tissue to respond between sessions.</li>
                <li><strong>What to expect:</strong> You may feel a stinging or burning sensation during injection. The keloid typically softens and flattens progressively over the course of treatment.</li>
                <li><strong>Possible side effects:</strong> Temporary skin lightening (hypopigmentation) around the injection site, skin thinning (atrophy), telangiectasia (tiny blood vessels), or a small depressed area. These are usually reversible.</li>
                <li><strong>Important:</strong> Completing all scheduled sessions is critical. Missing sessions may allow the keloid to regrow, reducing treatment effectiveness.</li>
              </ul>
            </div>
          )}

          {/* Surgery Education */}
          {treatmentPlan?.surgery?.planned && (
            <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
              <h4 className="font-semibold text-amber-800 text-sm mb-1 flex items-center gap-1">
                <Scissors size={14} /> Surgical Excision
              </h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
                <li><strong>Procedure:</strong> The keloid is carefully excised (removed) with precise surgical technique to minimize wound tension — a key factor in keloid recurrence.</li>
                <li><strong>What to expect:</strong> The procedure is typically performed under local anaesthesia. You will have stitches that will be reviewed and removed as advised by your surgeon.</li>
                <li><strong>Post-surgery care:</strong> Keep the wound clean and dry. Follow wound care instructions carefully. Avoid stretching or traumatizing the surgical site.</li>
                <li><strong>Recurrence prevention:</strong> Surgery alone has a high recurrence rate. This is why your plan includes additional treatments (injections, silicone, compression{treatmentPlan?.radiotherapy?.indicated ? ', and radiotherapy' : ''}) to prevent the keloid from returning.</li>
              </ul>
            </div>
          )}

          {/* Silicone & Compression Education */}
          <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
            <h4 className="font-semibold text-purple-800 text-sm mb-1 flex items-center gap-1">
              <Heart size={14} /> Silicone Sheet & Compression Therapy
            </h4>
            <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
              <li><strong>How it works:</strong> Silicone sheets create a moist, occluded environment that regulates collagen production. Compression garments apply constant pressure to flatten the scar and reduce blood flow to the keloid tissue.</li>
              <li><strong>Duration:</strong> These must be worn for at least {treatmentPlan?.siliconeCompression?.durationWeeks || 24} weeks (approximately {Math.round((treatmentPlan?.siliconeCompression?.durationWeeks || 24) / 4)} months) for optimal results. Longer use (up to 12-24 months) further reduces recurrence.</li>
              <li><strong>Daily use:</strong> Silicone sheets should be worn for a minimum of 12-23 hours per day. Compression garments should be worn continuously except when bathing.</li>
              <li><strong>Care:</strong> Wash silicone sheets daily with mild soap and water. Replace when they lose adhesion. Keep the skin underneath clean and dry.</li>
              <li><strong>Expected outcome:</strong> Gradual softening, flattening, and lightening of the scar. Full results typically visible after 3-6 months of consistent use.</li>
            </ul>
          </div>

          {/* Radiotherapy Education */}
          {treatmentPlan?.radiotherapy?.indicated && (
            <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
              <h4 className="font-semibold text-red-800 text-sm mb-1 flex items-center gap-1">
                <Zap size={14} /> Low-Dose Radiotherapy
              </h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
                <li><strong>Purpose:</strong> Superficial radiotherapy destroys the rapidly dividing fibroblast cells that cause keloid growth. It is one of the most effective treatments for preventing keloid recurrence.</li>
                <li><strong>Timing:</strong> Radiotherapy is most effective when given within 24-72 hours after surgical excision, while the wound is still healing.</li>
                <li><strong>Safety:</strong> Low-dose superficial radiation targets only the skin surface. The doses used for keloids are very low and the risk of serious complications is extremely small.</li>
                <li><strong>Side effects to know about:</strong> Skin redness (resolves in days-weeks), temporary darkening (2-4 weeks), mild dryness or peeling (use moisturiser), itching (antihistamines if needed).</li>
                <li><strong>Success rate:</strong> When combined with surgery, radiotherapy reduces keloid recurrence to approximately 10-20%.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Expected Outcomes & Compliance */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <h4 className="font-semibold text-green-800 text-sm mb-2 flex items-center gap-1">
              <CheckCircle2 size={14} /> Expected Treatment Outcomes
            </h4>
            <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
              <li>Significant reduction in keloid size and height</li>
              <li>Relief from pain, itching, and tenderness</li>
              <li>Improved cosmetic appearance</li>
              <li>Restored function if movement was limited</li>
              <li>Reduced psychological distress and improved quality of life</li>
              <li>Recurrence rate reduced to 10-20% with full compliance (vs 50-80% with surgery alone)</li>
            </ul>
          </div>

          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
            <h4 className="font-semibold text-amber-800 text-sm mb-2 flex items-center gap-1">
              <AlertTriangle size={14} /> Importance of Compliance
            </h4>
            <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
              <li><strong>Attend all scheduled appointments</strong> — each treatment session is carefully timed for maximum effectiveness</li>
              <li><strong>Wear silicone/compression daily</strong> — inconsistent use significantly increases recurrence risk</li>
              <li><strong>Do not skip injections</strong> — the treatment protocol depends on cumulative effect</li>
              <li><strong>Report any concerns early</strong> — redness, swelling, pain, or signs of infection should be reported immediately</li>
              <li><strong>Follow-up visits are essential</strong> — monitoring allows early detection and management of any recurrence</li>
              <li><strong>Long-term monitoring</strong> — keloids can recur months to years after treatment; regular check-ups are recommended for at least 12-24 months</li>
            </ul>
          </div>
        </div>

        {/* When to Seek Help */}
        <div className="mt-3 bg-red-50 rounded-lg p-3 border border-red-200">
          <h4 className="font-semibold text-red-800 text-sm mb-1 flex items-center gap-1">
            <AlertTriangle size={14} /> When to Contact Your Doctor
          </h4>
          <div className="text-sm text-gray-700 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5 ml-4">
            <p>• Signs of wound infection (pus, increasing redness, fever)</p>
            <p>• Severe pain not controlled by prescribed medication</p>
            <p>• Rapid regrowth of the keloid after treatment</p>
            <p>• Allergic reaction to medications or silicone</p>
            <p>• Excessive skin thinning or colour change at injection site</p>
            <p>• Any side effects from radiotherapy that persist beyond 2 weeks</p>
          </div>
        </div>
      </div>

      {/* Created Info */}
      <div className="text-xs text-gray-400 text-center">
        Created by {plan.createdByName} on {format(new Date(plan.createdAt), 'dd MMM yyyy, HH:mm')}
      </div>
    </div>
  );
}
