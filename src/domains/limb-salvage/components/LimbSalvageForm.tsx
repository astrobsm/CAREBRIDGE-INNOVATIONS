// Main Limb Salvage Assessment Form - Multi-step Wizard
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Check,
  User,
  Activity,
  Heart,
  Bug,
  Pill,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

import PatientSelectionStep from './PatientSelectionStep';
import WoundClassificationStep from './WoundClassificationStep';
import VascularAssessmentStep from './VascularAssessmentStep';
import InfectionOsteoStep from './InfectionOsteoStep';
import ComorbiditiesStep from './ComorbiditiesStep';
import ScoreSummaryStep from './ScoreSummaryStep';

import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { calculateLimbSalvageScore, generateRecommendations, recommendAmputationLevel, determineManagement } from '../../../services/limbSalvageService';

import type { 
  LimbSalvageAssessment,
  WagnerGrade,
  TexasClassification,
  WIFIClassification,
  SINBADScore,
  DopplerFindings,
  OsteomyelitisAssessment,
  SepsisAssessment,
  RenalStatus,
  DiabeticFootComorbidities,
  LimbSalvageScore,
  LimbSalvageRecommendation,
  AmputationLevel,
} from '../../../types';

interface LimbSalvageFormProps {
  onClose: () => void;
  onSave: () => void;
  existingAssessment?: LimbSalvageAssessment;
}

// Initial state for form
const getInitialFormData = (): Partial<LimbSalvageAssessment> => ({
  patientId: '',
  patientAge: 0,
  patientGender: 'male',
  affectedSide: 'left',
  wagnerGrade: 0 as WagnerGrade,
  texasClassification: { grade: 0, stage: 'A' } as TexasClassification,
  wifiClassification: { wound: 0, ischemia: 0, footInfection: 0 } as WIFIClassification,
  sinbadScore: { site: 0, ischemia: 0, neuropathy: 0, bacterialInfection: 0, area: 0, depth: 0, total: 0 } as SINBADScore,
  woundLocation: '',
  woundSize: { length: 0, width: 0, depth: 0, area: 0 },
  woundDuration: 0,
  previousDebridement: false,
  debridementCount: 0,
  dopplerFindings: {
    arterial: {
      femoralArtery: 'not_assessed',
      poplitealArtery: 'not_assessed',
      anteriorTibialArtery: 'not_assessed',
      posteriorTibialArtery: 'not_assessed',
      dorsalisPedisArtery: 'not_assessed',
      peronealArtery: 'not_assessed',
      abi: 1.0,
      waveform: 'triphasic',
      calcification: false,
    },
    venous: {
      greatSaphenousVein: 'not_assessed',
      smallSaphenousVein: 'not_assessed',
      poplitealVein: 'not_assessed',
      femoralVein: 'not_assessed',
      deepVeinThrombosis: false,
      chronicVenousInsufficiency: false,
    },
  } as DopplerFindings,
  angiogramPerformed: false,
  angiogramFindings: '',
  previousRevascularization: false,
  revascularizationDetails: '',
  monofilamentTest: false,
  vibrationSense: false,
  ankleReflexes: 'present',
  neuropathySymptoms: [],
  osteomyelitis: {
    suspected: false,
    probeToBone: false,
    radiographicChanges: false,
    affectedBones: [],
  } as OsteomyelitisAssessment,
  sepsis: {
    clinicalFeatures: {
      alteredMentalStatus: false,
      respiratoryRate: 16,
      systolicBP: 120,
      temperature: 37,
      heartRate: 80,
      qsofaScore: 0,
    },
    laboratoryFeatures: {
      wbc: 8,
    },
    sirsScore: 0,
    sepsisSeverity: 'none',
  } as SepsisAssessment,
  renalStatus: {
    creatinine: 1.0,
    egfr: 90,
    ckdStage: 1,
    onDialysis: false,
  } as RenalStatus,
  comorbidities: {
    diabetesType: 'type2',
    diabetesDuration: 5,
    onInsulin: false,
    oralHypoglycemics: [],
    hypertension: false,
    coronaryArteryDisease: false,
    heartFailure: false,
    previousMI: false,
    previousStroke: false,
    peripheralVascularDisease: false,
    chronicKidneyDisease: false,
    retinopathy: false,
    neuropathy: false,
    previousAmputation: false,
    smoking: false,
  } as DiabeticFootComorbidities,
  albumin: 4.0,
  prealbumin: 20,
  bmi: 25,
  mustScore: 0,
  limbSalvageScore: {
    woundScore: 0,
    ischemiaScore: 0,
    infectionScore: 0,
    renalScore: 0,
    comorbidityScore: 0,
    ageScore: 0,
    nutritionalScore: 0,
    totalScore: 0,
    maxScore: 100,
    percentage: 0,
    riskCategory: 'low',
    salvageProbability: 'excellent',
  } as LimbSalvageScore,
  recommendedManagement: 'conservative',
  recommendedAmputationLevel: 'none' as AmputationLevel,
  recommendations: [] as LimbSalvageRecommendation[],
  treatmentPlan: '',
  status: 'draft',
});

const steps = [
  { id: 1, name: 'Patient', icon: User },
  { id: 2, name: 'Wound', icon: Activity },
  { id: 3, name: 'Vascular', icon: Heart },
  { id: 4, name: 'Infection', icon: Bug },
  { id: 5, name: 'Comorbidities', icon: Pill },
  { id: 6, name: 'Results', icon: FileText },
];

export default function LimbSalvageForm({ onClose, onSave, existingAssessment }: LimbSalvageFormProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<LimbSalvageAssessment>>(
    existingAssessment || getInitialFormData()
  );
  const [isSaving, setIsSaving] = useState(false);

  // Update form data
  const updateFormData = (data: Partial<LimbSalvageAssessment>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  // Calculate scores when moving to results step
  useEffect(() => {
    if (currentStep === 6) {
      // Calculate limb salvage score
      const score = calculateLimbSalvageScore(formData);
      const management = determineManagement(formData);
      const amputationLevel = recommendAmputationLevel(formData);
      const recommendations = generateRecommendations(formData);

      updateFormData({
        limbSalvageScore: score,
        recommendedManagement: management,
        recommendedAmputationLevel: amputationLevel,
        recommendations,
      });
    }
  }, [currentStep]);

  // Validate step before moving forward
  const validateStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.patientId) {
          toast.error('Please select a patient');
          return false;
        }
        break;
      case 2:
        if (!formData.woundLocation) {
          toast.error('Please enter wound location');
          return false;
        }
        break;
    }
    return true;
  };

  // Navigation
  const goNext = () => {
    if (validateStep() && currentStep < 6) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Save assessment
  const handleSave = async (status: 'draft' | 'completed') => {
    if (!formData.patientId) {
      toast.error('Please select a patient');
      return;
    }

    setIsSaving(true);
    try {
      const assessment: LimbSalvageAssessment = {
        id: existingAssessment?.id || uuidv4(),
        patientId: formData.patientId!,
        encounterId: formData.encounterId,
        admissionId: formData.admissionId,
        hospitalId: user?.hospitalId,
        assessmentDate: new Date(),
        assessedBy: user?.id || '',
        assessedByName: user ? `${user.firstName} ${user.lastName}` : '',
        patientAge: formData.patientAge!,
        patientGender: formData.patientGender!,
        affectedSide: formData.affectedSide!,
        wagnerGrade: formData.wagnerGrade!,
        texasClassification: formData.texasClassification!,
        wifiClassification: formData.wifiClassification!,
        sinbadScore: formData.sinbadScore!,
        woundLocation: formData.woundLocation!,
        woundSize: formData.woundSize!,
        woundDuration: formData.woundDuration!,
        previousDebridement: formData.previousDebridement!,
        debridementCount: formData.debridementCount,
        dopplerFindings: formData.dopplerFindings!,
        angiogramPerformed: formData.angiogramPerformed!,
        angiogramFindings: formData.angiogramFindings,
        previousRevascularization: formData.previousRevascularization!,
        revascularizationDetails: formData.revascularizationDetails,
        monofilamentTest: formData.monofilamentTest!,
        vibrationSense: formData.vibrationSense!,
        ankleReflexes: formData.ankleReflexes!,
        neuropathySymptoms: formData.neuropathySymptoms!,
        osteomyelitis: formData.osteomyelitis!,
        sepsis: formData.sepsis!,
        renalStatus: formData.renalStatus!,
        comorbidities: formData.comorbidities!,
        albumin: formData.albumin,
        prealbumin: formData.prealbumin,
        bmi: formData.bmi,
        mustScore: formData.mustScore,
        limbSalvageScore: formData.limbSalvageScore!,
        recommendedManagement: formData.recommendedManagement!,
        recommendedAmputationLevel: formData.recommendedAmputationLevel,
        recommendations: formData.recommendations!,
        treatmentPlan: formData.treatmentPlan,
        followUpDate: formData.followUpDate,
        status,
        createdAt: existingAssessment?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      if (existingAssessment) {
        await db.limbSalvageAssessments.update(existingAssessment.id, assessment);
        toast.success('Assessment updated successfully');
      } else {
        await db.limbSalvageAssessments.add(assessment);
        toast.success('Assessment saved successfully');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast.error('Failed to save assessment');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {existingAssessment ? 'Edit' : 'New'} Limb Salvage Assessment
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                  className={`flex flex-col items-center ${
                    step.id <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'
                  }`}
                  disabled={step.id > currentStep}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    step.id === currentStep 
                      ? 'bg-blue-600 text-white' 
                      : step.id < currentStep 
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step.id < currentStep ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 ${
                    step.id === currentStep ? 'text-blue-600 font-medium' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
                </button>
                {idx < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    step.id < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <PatientSelectionStep
              selectedPatientId={formData.patientId || ''}
              patientAge={formData.patientAge || 0}
              patientGender={formData.patientGender || 'male'}
              affectedSide={formData.affectedSide || 'left'}
              onUpdate={updateFormData}
            />
          )}
          {currentStep === 2 && (
            <WoundClassificationStep
              wagnerGrade={formData.wagnerGrade || 0}
              texasClassification={formData.texasClassification || { grade: 0, stage: 'A' }}
              wifiClassification={formData.wifiClassification || { wound: 0, ischemia: 0, footInfection: 0 }}
              sinbadScore={formData.sinbadScore || { site: 0, ischemia: 0, neuropathy: 0, bacterialInfection: 0, area: 0, depth: 0, total: 0 }}
              woundLocation={formData.woundLocation || ''}
              woundSize={formData.woundSize || { length: 0, width: 0, depth: 0, area: 0 }}
              woundDuration={formData.woundDuration || 0}
              previousDebridement={formData.previousDebridement || false}
              debridementCount={formData.debridementCount || 0}
              onUpdate={updateFormData}
            />
          )}
          {currentStep === 3 && (
            <VascularAssessmentStep
              dopplerFindings={formData.dopplerFindings!}
              angiogramPerformed={formData.angiogramPerformed || false}
              angiogramFindings={formData.angiogramFindings || ''}
              previousRevascularization={formData.previousRevascularization || false}
              revascularizationDetails={formData.revascularizationDetails || ''}
              onUpdate={updateFormData}
            />
          )}
          {currentStep === 4 && (
            <InfectionOsteoStep
              osteomyelitis={formData.osteomyelitis!}
              sepsis={formData.sepsis!}
              monofilamentTest={formData.monofilamentTest || false}
              vibrationSense={formData.vibrationSense || false}
              ankleReflexes={formData.ankleReflexes || 'present'}
              neuropathySymptoms={formData.neuropathySymptoms || []}
              onUpdate={updateFormData}
            />
          )}
          {currentStep === 5 && (
            <ComorbiditiesStep
              renalStatus={formData.renalStatus!}
              comorbidities={formData.comorbidities!}
              albumin={formData.albumin || 4.0}
              prealbumin={formData.prealbumin || 20}
              bmi={formData.bmi || 25}
              mustScore={formData.mustScore || 0}
              onUpdate={updateFormData}
            />
          )}
          {currentStep === 6 && (
            <ScoreSummaryStep
              limbSalvageScore={formData.limbSalvageScore!}
              recommendations={formData.recommendations || []}
              recommendedManagement={formData.recommendedManagement || 'conservative'}
              recommendedAmputationLevel={formData.recommendedAmputationLevel || 'none'}
              treatmentPlan={formData.treatmentPlan || ''}
              followUpDate={formData.followUpDate || null}
              onUpdate={updateFormData}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <button
            onClick={goPrev}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              currentStep === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ChevronLeft className="h-5 w-5" />
            Previous
          </button>

          <div className="flex gap-3">
            {currentStep === 6 && (
              <>
                <button
                  onClick={() => handleSave('draft')}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  <Save className="h-5 w-5" />
                  Save Draft
                </button>
                <button
                  onClick={() => handleSave('completed')}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Check className="h-5 w-5" />
                  Complete Assessment
                </button>
              </>
            )}
            {currentStep < 6 && (
              <button
                onClick={goNext}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
