/**
 * Preoperative Assessment Page
 * AstroHEALTH Innovations in Healthcare
 * 
 * Comprehensive preoperative anaesthetic review for surgical patients
 */

import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  User,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Activity,
  Wind,
  Stethoscope,
  Clipboard,
  Pill,
  Coffee,
  Calendar,
  Download,
  ClipboardList,
  Eye,
  Syringe,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { VoiceDictation } from '../../../components/common';
import {
  preoperativeService,
  asaClassifications,
  mallampatiScores,
  capriniRiskFactors,
  rcriFactors,
  fastingGuidelines,
} from '../../../services/preoperativeService';
import type { ASAClassification } from '../../../services/preoperativeService';
import type { PreoperativeAssessment } from '../../../types';

// Form schema
const assessmentSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  surgeryType: z.enum(['minor', 'intermediate', 'major']),
  surgeryName: z.string().min(1, 'Surgery name is required'),
  scheduledDate: z.string().min(1, 'Date is required'),
  asaClass: z.number().min(1).max(6),
  asaEmergency: z.boolean(),
});

type AssessmentFormData = z.infer<typeof assessmentSchema>;

// Assessment steps
type StepType = 'basic' | 'airway' | 'cardiac' | 'pulmonary' | 'vte' | 'bleeding' | 'fasting' | 'medications' | 'summary';

const steps: { id: StepType; label: string; icon: any }[] = [
  { id: 'basic', label: 'Basic Info', icon: User },
  { id: 'airway', label: 'Airway', icon: Wind },
  { id: 'cardiac', label: 'Cardiac', icon: Heart },
  { id: 'pulmonary', label: 'Pulmonary', icon: Activity },
  { id: 'vte', label: 'VTE Risk', icon: AlertTriangle },
  { id: 'bleeding', label: 'Bleeding', icon: Stethoscope },
  { id: 'fasting', label: 'Fasting', icon: Coffee },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'summary', label: 'Summary', icon: Clipboard },
];

export default function PreoperativeAssessmentPage() {
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<StepType>('basic');
  
  // Assessment state
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [asaClass, setAsaClass] = useState<ASAClassification>(1);
  const [asaEmergency, setAsaEmergency] = useState(false);
  
  // Airway state
  const [mallampati, setMallampati] = useState<1 | 2 | 3 | 4>(1);
  const [mouthOpening, setMouthOpening] = useState(4);
  const [thyromentalDistance, setThyromentalDistance] = useState(7);
  const [neckMobility, setNeckMobility] = useState<'normal' | 'limited' | 'fixed'>('normal');
  const [previousDifficult, setPreviousDifficult] = useState(false);
  
  // Cardiac state
  const [rcriSelectedFactors, setRcriSelectedFactors] = useState<string[]>([]);
  const [metsValue, setMetsValue] = useState(5);
  
  // VTE state
  const [capriniSelectedFactors, setCapriniSelectedFactors] = useState<string[]>([]);
  
  // Bleeding state
  const [onAnticoagulant, setOnAnticoagulant] = useState(false);
  const [anticoagulantType, setAnticoagulantType] = useState('');
  const [bleedingHistory, setBleedingHistory] = useState(false);
  
  // Fasting state
  const [surgeryDateTime, setSurgeryDateTime] = useState('');
  
  // Medication notes state
  const [patientAllergies, setPatientAllergies] = useState('');
  const [medicationNotes, setMedicationNotes] = useState('');
  
  // Navigation
  const navigate = useNavigate();
  
  // Data queries
  const patients = useLiveQuery(() => db.patients.filter(p => p.isActive === true).toArray(), []);
  
  // Fetch all preoperative assessments
  const assessments = useLiveQuery(
    () => db.preoperativeAssessments.orderBy('createdAt').reverse().toArray(),
    []
  );

  // Fetch current user
  const user = useLiveQuery(() => db.users.get('current-user'), []);
  
  // Fetch all users for mapping
  const users = useLiveQuery(() => db.users.toArray(), []);
  
  // Fetch booked surgical cases assigned to current user as anaesthetist
  const bookedCases = useLiveQuery(
    () => {
      if (!user) return [];
      return db.surgeries
        .filter(surgery => 
          surgery.status === 'scheduled' && 
          (surgery.anaesthetist === user.id || surgery.anaesthetistId === user.id)
        )
        .toArray();
    },
    [user]
  );
  
  // State for selected surgery from booked cases
  const [selectedSurgery, setSelectedSurgery] = useState<any>(null);
  
  // Create maps for quick lookups
  const patientsMap = useMemo(() => {
    if (!patients) return new Map();
    return new Map(patients.map(p => [p.id, p]));
  }, [patients]);
  
  const usersMap = useMemo(() => {
    if (!users) return new Map();
    return new Map(users.map(u => [u.id, u]));
  }, [users]);

  // Fetch prescriptions for selected patient
  const prescriptions = useLiveQuery(
    () => {
      if (!selectedPatientId) return [];
      return db.prescriptions.where('patientId').equals(selectedPatientId).toArray();
    },
    [selectedPatientId]
  );

  // Selected patient details
  const selectedPatient = useMemo(() => {
    if (!selectedPatientId || !patients) return null;
    return patients.find(p => p.id === selectedPatientId) || null;
  }, [selectedPatientId, patients]);

  // Flatten medications from prescriptions
  const currentMedications = useMemo(() => {
    if (!prescriptions) return [];
    return prescriptions.flatMap(rx => 
      rx.medications.map(med => ({
        ...med,
        prescribedAt: rx.prescribedAt,
        prescriptionStatus: rx.status,
      }))
    ).filter(m => !m.isDispensed);
  }, [prescriptions]);

  const form = useForm<AssessmentFormData>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      asaClass: 1,
      asaEmergency: false,
      surgeryType: 'intermediate',
    },
  });

  // Calculate risks
  const airwayDifficulty = useMemo(() => {
    return preoperativeService.assessAirway({
      mallampatiScore: mallampati,
      mouthOpening,
      thyromentalDistance,
      neckMobility,
      previousDifficultIntubation: previousDifficult,
    });
  }, [mallampati, mouthOpening, thyromentalDistance, neckMobility, previousDifficult]);

  const rcriResult = useMemo(() => {
    const factors = {
      highRiskSurgery: rcriSelectedFactors.includes(rcriFactors[0].factor),
      ischemicHeartDisease: rcriSelectedFactors.includes(rcriFactors[1].factor),
      heartFailure: rcriSelectedFactors.includes(rcriFactors[2].factor),
      cerebrovascularDisease: rcriSelectedFactors.includes(rcriFactors[3].factor),
      insulinDependentDiabetes: rcriSelectedFactors.includes(rcriFactors[4].factor),
      renalInsufficiency: rcriSelectedFactors.includes(rcriFactors[5].factor),
    };
    return preoperativeService.calculateRCRI(factors);
  }, [rcriSelectedFactors]);

  const capriniResult = useMemo(() => {
    return preoperativeService.calculateCapriniScore(capriniSelectedFactors);
  }, [capriniSelectedFactors]);

  const fastingInstructions = useMemo(() => {
    if (!surgeryDateTime) return [];
    return preoperativeService.generateFastingInstructions(new Date(surgeryDateTime));
  }, [surgeryDateTime]);

  // Pre-fill form when a booked surgery is selected
  useEffect(() => {
    if (selectedSurgery && patients) {
      const patient = patientsMap.get(selectedSurgery.patientId);
      if (patient) {
        setSelectedPatientId(selectedSurgery.patientId);
        setSurgeryDateTime(new Date(selectedSurgery.scheduledDate).toISOString().slice(0, 16));
        form.setValue('surgeryName', selectedSurgery.procedureName);
        form.setValue('surgeryType', selectedSurgery.category === 'major' ? 'major' : 'intermediate');
        form.setValue('scheduledDate', new Date(selectedSurgery.scheduledDate).toISOString().slice(0, 16));
        
        // Pre-fill ASA score if available
        if (selectedSurgery.preOperativeAssessment?.asaScore) {
          const asaScore = selectedSurgery.preOperativeAssessment.asaScore;
          setAsaClass(asaScore);
          form.setValue('asaClass', asaScore);
        }
      }
    }
  }, [selectedSurgery, patients, patientsMap, form]);

  // Handle step navigation
  const goToNextStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const goToPrevStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  // Toggle RCRI factor
  const toggleRcriFactorFn = (factor: string) => {
    setRcriSelectedFactors(prev =>
      prev.includes(factor) ? prev.filter(f => f !== factor) : [...prev, factor]
    );
  };

  // Toggle Caprini factor
  const toggleCapriniFactor = (factor: string) => {
    setCapriniSelectedFactors(prev =>
      prev.includes(factor) ? prev.filter(f => f !== factor) : [...prev, factor]
    );
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedPatientId || !selectedPatient) {
      toast.error('Please select a patient');
      return;
    }

    try {
      const formData = form.getValues();
      const assessmentId = `preop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const assessment: PreoperativeAssessment = {
        id: assessmentId,
        patientId: selectedPatientId,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        hospitalNumber: selectedPatient.hospitalNumber,
        surgeryName: formData.surgeryName,
        surgeryType: formData.surgeryType,
        scheduledDate: surgeryDateTime ? new Date(surgeryDateTime) : new Date(),
        asaClass: asaClass as ASAClassification,
        asaEmergency,
        airwayAssessment: {
          mallampatiScore: mallampati,
          mouthOpening,
          thyromentalDistance,
          neckMobility,
          previousDifficultIntubation: previousDifficult,
          predictedDifficulty: airwayDifficulty,
        },
        cardiacRisk: {
          rcriScore: rcriResult.score,
          rcriRisk: rcriResult.risk,
          selectedFactors: rcriSelectedFactors,
          functionalCapacity: metsValue,
        },
        vteRisk: {
          capriniScore: capriniResult.capriniScore,
          riskCategory: capriniResult.riskCategory,
          prophylaxisRecommendation: capriniResult.prophylaxisRecommendation,
          selectedFactors: capriniSelectedFactors,
        },
        bleedingRisk: {
          onAnticoagulant,
          anticoagulantType,
          bleedingHistory,
        },
        status: 'pending',
        clearanceStatus: 'pending_review',
        assessedBy: 'current_user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.preoperativeAssessments.add(assessment);
      await syncRecord('preoperativeAssessments', assessment as unknown as Record<string, unknown>);
      
      toast.success('Preoperative assessment saved successfully');
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast.error('Failed to save assessment');
    }
  };

  const resetForm = () => {
    setCurrentStep('basic');
    setSelectedPatientId('');
    setSelectedSurgery(null);
    setAsaClass(1);
    setAsaEmergency(false);
    setMallampati(1);
    setMouthOpening(4);
    setThyromentalDistance(7);
    setNeckMobility('normal');
    setPreviousDifficult(false);
    setRcriSelectedFactors([]);
    setMetsValue(5);
    setCapriniSelectedFactors([]);
    setOnAnticoagulant(false);
    setAnticoagulantType('');
    setBleedingHistory(false);
    setSurgeryDateTime('');
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Patient Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                title="Select patient for preoperative assessment"
              >
                <option value="">Select Patient</option>
                {patients?.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.hospitalNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Patient Details Card */}
            {selectedPatient && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-blue-900 flex items-center gap-2">
                    <ClipboardList size={18} />
                    Patient Information
                  </h4>
                  <button
                    type="button"
                    onClick={() => navigate(`/patients/${selectedPatientId}/clinical-summary`)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Eye size={14} />
                    View Full Summary
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Hospital No:</span>
                    <p className="font-medium">{selectedPatient.hospitalNumber}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Gender:</span>
                    <p className="font-medium capitalize">{selectedPatient.gender}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Age:</span>
                    <p className="font-medium">
                      {selectedPatient.dateOfBirth 
                        ? Math.floor((new Date().getTime() - new Date(selectedPatient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) + ' years'
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Blood Group:</span>
                    <p className="font-medium">{selectedPatient.bloodGroup || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Genotype:</span>
                    <p className="font-medium">{selectedPatient.genotype || 'Unknown'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Allergies:</span>
                    <p className="font-medium text-red-600">{selectedPatient.allergies || 'None known'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Current Medications Card */}
            {selectedPatient && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                  <Syringe size={18} />
                  Current Medications ({currentMedications.length})
                </h4>
                {currentMedications.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {currentMedications.map((med, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <p className="font-medium text-gray-900">{med.name}</p>
                          <p className="text-xs text-gray-500">{med.dosage} • {med.frequency} • {med.route}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          med.prescriptionStatus === 'dispensed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {med.prescriptionStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-purple-700">No active medications on record</p>
                )}
                {currentMedications.length > 0 && (
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                    <AlertTriangle size={12} className="inline mr-1" />
                    <strong>Note:</strong> Review medications for perioperative management. Consider stopping anticoagulants, antiplatelet agents, and certain herbal supplements before surgery.
                  </div>
                )}
              </div>
            )}

            {/* Surgery Details */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Surgery Name *</label>
                <input
                  type="text"
                  {...form.register('surgeryName')}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Laparoscopic Cholecystectomy"
                  title="Surgery name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Surgery Type</label>
                <select
                  {...form.register('surgeryType')}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  title="Surgery type"
                >
                  <option value="minor">Minor (Local/No sedation)</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="major">Major</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date & Time</label>
              <input
                type="datetime-local"
                value={surgeryDateTime}
                onChange={(e) => setSurgeryDateTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                title="Select surgery date and time"
              />
            </div>

            {/* ASA Classification */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ASA Classification</label>
              <div className="space-y-2">
                {asaClassifications.filter(a => a.class <= 5).map((asa) => (
                  <label
                    key={asa.class}
                    className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                      asaClass === asa.class
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={asaClass === asa.class}
                      onChange={() => setAsaClass(asa.class)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">ASA {asa.class}</span>
                        <span className="text-xs text-gray-500">Mortality: {asa.mortalityRisk}</span>
                      </div>
                      <p className="text-sm text-gray-600">{asa.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{asa.examples.slice(0, 3).join(', ')}</p>
                    </div>
                  </label>
                ))}
              </div>

              <label className="flex items-center mt-3">
                <input
                  type="checkbox"
                  checked={asaEmergency}
                  onChange={(e) => setAsaEmergency(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Emergency case (add "E" suffix)</span>
              </label>
            </div>
          </div>
        );

      case 'airway':
        return (
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Wind className="text-primary-600" />
              Airway Assessment
            </h3>

            {/* Mallampati Score */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mallampati Score</label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {mallampatiScores.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMallampati((idx + 1) as 1 | 2 | 3 | 4)}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      mallampati === idx + 1
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl font-bold">{idx + 1}</div>
                    <div className="text-xs text-gray-500">{m.difficulty}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Physical Measurements */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mouth Opening (cm)
                </label>
                <input
                  type="number"
                  value={mouthOpening}
                  onChange={(e) => setMouthOpening(Number(e.target.value))}
                  min={0}
                  max={10}
                  step={0.5}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  title="Mouth opening in centimeters"
                />
                <p className="text-xs text-gray-500 mt-1">Normal: ≥3 finger breadths (≥4cm)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thyromental Distance (cm)
                </label>
                <input
                  type="number"
                  value={thyromentalDistance}
                  onChange={(e) => setThyromentalDistance(Number(e.target.value))}
                  min={0}
                  max={15}
                  step={0.5}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  title="Thyromental distance in centimeters"
                />
                <p className="text-xs text-gray-500 mt-1">Normal: ≥6cm</p>
              </div>
            </div>

            {/* Neck Mobility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Neck Mobility</label>
              <select
                value={neckMobility}
                onChange={(e) => setNeckMobility(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                title="Neck mobility assessment"
              >
                <option value="normal">Normal (≥35° extension)</option>
                <option value="limited">Limited</option>
                <option value="fixed">Fixed/Immobile</option>
              </select>
            </div>

            {/* Previous Difficult Intubation */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={previousDifficult}
                onChange={(e) => setPreviousDifficult(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">History of difficult intubation</span>
            </label>

            {/* Airway Assessment Result */}
            <div className={`p-4 rounded-lg ${
              airwayDifficulty === 'anticipated_difficult' ? 'bg-red-50 border border-red-200' :
              airwayDifficulty === 'potentially_difficult' ? 'bg-yellow-50 border border-yellow-200' :
              'bg-green-50 border border-green-200'
            }`}>
              <h4 className="font-medium flex items-center gap-2">
                {airwayDifficulty === 'anticipated_difficult' && <AlertTriangle className="text-red-600" size={18} />}
                {airwayDifficulty === 'potentially_difficult' && <AlertTriangle className="text-yellow-600" size={18} />}
                {airwayDifficulty === 'easy' && <CheckCircle2 className="text-green-600" size={18} />}
                Predicted Airway: {airwayDifficulty.replace('_', ' ').toUpperCase()}
              </h4>
              {airwayDifficulty !== 'easy' && (
                <p className="text-sm mt-2">
                  Consider: difficult airway cart ready, senior anaesthetist, video laryngoscope, fibreoptic backup
                </p>
              )}
            </div>
          </div>
        );

      case 'cardiac':
        return (
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Heart className="text-red-600" />
              Cardiac Risk Assessment (RCRI)
            </h3>

            <p className="text-sm text-gray-600">
              Revised Cardiac Risk Index - select all that apply:
            </p>

            <div className="space-y-2">
              {rcriFactors.map((factor, idx) => (
                <label
                  key={idx}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                    rcriSelectedFactors.includes(factor.factor)
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={rcriSelectedFactors.includes(factor.factor)}
                    onChange={() => toggleRcriFactorFn(factor.factor)}
                    className="mr-3"
                  />
                  <span className="text-sm">{factor.factor}</span>
                </label>
              ))}
            </div>

            {/* Functional Capacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Functional Capacity (METs)
              </label>
              <input
                type="range"
                min={1}
                max={12}
                value={metsValue}
                onChange={(e) => setMetsValue(Number(e.target.value))}
                className="w-full"
                title="Select functional capacity in METs"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Poor (&lt;4)</span>
                <span className="font-medium">{metsValue} METs - {preoperativeService.assessFunctionalCapacity(metsValue)}</span>
                <span>Excellent (&gt;10)</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                4 METs = climb 2 flights of stairs, walk up hill, heavy housework
              </p>
            </div>

            {/* RCRI Result */}
            <div className={`p-4 rounded-lg ${
              rcriResult.score >= 3 ? 'bg-red-50 border border-red-200' :
              rcriResult.score >= 2 ? 'bg-yellow-50 border border-yellow-200' :
              'bg-green-50 border border-green-200'
            }`}>
              <h4 className="font-medium">RCRI Score: {rcriResult.score}</h4>
              <p className="text-sm">Risk: {rcriResult.risk}</p>
              <ul className="text-sm mt-2 space-y-1">
                {rcriResult.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span>•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'vte':
        return (
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="text-orange-600" />
              VTE Risk Assessment (Caprini Score)
            </h3>

            <div className="max-h-96 overflow-y-auto space-y-1">
              {/* Group by points */}
              {[1, 2, 3, 5].map(points => (
                <div key={points} className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 sticky top-0 bg-white py-1">
                    {points} Point{points > 1 ? 's' : ''} Each
                  </h4>
                  {capriniRiskFactors.filter(f => f.points === points).map((factor, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center p-2 border rounded cursor-pointer text-sm ${
                        capriniSelectedFactors.includes(factor.factor)
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={capriniSelectedFactors.includes(factor.factor)}
                        onChange={() => toggleCapriniFactor(factor.factor)}
                        className="mr-2"
                      />
                      <span>{factor.factor}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>

            {/* Caprini Result */}
            <div className={`p-4 rounded-lg ${
              capriniResult.riskCategory === 'high' ? 'bg-red-50 border border-red-200' :
              capriniResult.riskCategory === 'moderate' ? 'bg-yellow-50 border border-yellow-200' :
              'bg-green-50 border border-green-200'
            }`}>
              <h4 className="font-medium">Caprini Score: {capriniResult.capriniScore}</h4>
              <p className="text-sm">Risk Category: {capriniResult.riskCategory.toUpperCase()}</p>
              <p className="text-sm mt-2 font-medium">{capriniResult.prophylaxisRecommendation}</p>
              {capriniResult.prophylaxisDrug && (
                <p className="text-sm text-gray-600 mt-1">Drug: {capriniResult.prophylaxisDrug}</p>
              )}
              {capriniResult.duration && (
                <p className="text-sm text-gray-600">Duration: {capriniResult.duration}</p>
              )}
            </div>
          </div>
        );

      case 'bleeding':
        return (
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Stethoscope className="text-red-600" />
              Bleeding Risk Assessment
            </h3>

            {/* Anticoagulant Use */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={onAnticoagulant}
                onChange={(e) => setOnAnticoagulant(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium">Currently on anticoagulant/antiplatelet therapy</span>
            </label>

            {onAnticoagulant && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medication</label>
                <select
                  value={anticoagulantType}
                  onChange={(e) => setAnticoagulantType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  title="Anticoagulant medication type"
                >
                  <option value="">Select...</option>
                  <option value="warfarin">Warfarin</option>
                  <option value="rivaroxaban">Rivaroxaban (Xarelto)</option>
                  <option value="apixaban">Apixaban (Eliquis)</option>
                  <option value="dabigatran">Dabigatran (Pradaxa)</option>
                  <option value="enoxaparin">Enoxaparin (Clexane)</option>
                  <option value="aspirin">Aspirin</option>
                  <option value="clopidogrel">Clopidogrel (Plavix)</option>
                </select>

                {anticoagulantType && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-sm">Management Recommendation:</h4>
                    {(() => {
                      const mgmt = preoperativeService.getAnticoagulantManagement(anticoagulantType, 'major');
                      return (
                        <ul className="text-sm mt-1 space-y-1">
                          <li>Hold: {mgmt.holdDuration}</li>
                          <li>Restart: {mgmt.restartInstruction}</li>
                        </ul>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Bleeding History */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={bleedingHistory}
                onChange={(e) => setBleedingHistory(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Personal or family history of bleeding disorders</span>
            </label>

            {/* Coagulation Results */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Coagulation Results (if available)</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500">INR</label>
                  <input
                    type="number"
                    step={0.1}
                    placeholder="1.0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">APTT (sec)</label>
                  <input
                    type="number"
                    placeholder="30"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Platelets (×10⁹/L)</label>
                  <input
                    type="number"
                    placeholder="250"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'fasting':
        return (
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Coffee className="text-amber-600" />
              Fasting Guidelines
            </h3>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium mb-3">Standard Fasting Times:</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(fastingGuidelines).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-sm">{value.description}</span>
                    <span className="font-medium">{value.hours} hours</span>
                  </div>
                ))}
              </div>
            </div>

            {surgeryDateTime && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Calendar size={18} />
                  Patient Instructions for Surgery on {format(new Date(surgeryDateTime), 'MMMM d, yyyy')}
                </h4>
                <div className="space-y-2 text-sm">
                  {fastingInstructions.map((instruction, idx) => (
                    <p key={idx} className={instruction.startsWith('❌') ? 'text-red-600 font-medium' : ''}>
                      {instruction}
                    </p>
                  ))}
                </div>
                <button className="mt-4 flex items-center gap-2 text-primary-600 hover:underline">
                  <Download size={16} />
                  Download Fasting Instructions PDF
                </button>
              </div>
            )}
          </div>
        );

      case 'medications':
        return (
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Pill className="text-purple-600" />
              Medication Review
            </h3>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-medium mb-2">General Preoperative Medication Guidelines:</h4>
              <ul className="text-sm space-y-2">
                <li><strong>CONTINUE:</strong> Antihypertensives (except ACE-I/ARBs), beta-blockers, statins, anticonvulsants, asthma inhalers</li>
                <li><strong>HOLD:</strong> ACE-I/ARBs on morning of surgery, diuretics, oral hypoglycemics, insulin (reduce dose), anticoagulants (as per protocol)</li>
                <li><strong>SPECIAL:</strong> MAOIs (liaise with psychiatry), steroids (stress dose needed), antiretrovirals (take with sip of water)</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Patient Allergies</h4>
              <VoiceDictation
                value={patientAllergies}
                onChange={setPatientAllergies}
                placeholder="List any known allergies..."
                rows={2}
                medicalContext="preoperative"
                showAIEnhance={true}
              />
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Current Medications</h4>
              <VoiceDictation
                value={medicationNotes}
                onChange={setMedicationNotes}
                placeholder="List current medications with doses..."
                rows={4}
                medicalContext="preoperative"
                showAIEnhance={true}
              />
            </div>
          </div>
        );

      case 'summary':
        return (
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clipboard className="text-primary-600" />
              Assessment Summary
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm text-gray-500">ASA Classification</h4>
                <p className="text-xl font-bold">ASA {asaClass}{asaEmergency ? 'E' : ''}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm text-gray-500">Airway</h4>
                <p className={`text-xl font-bold ${
                  airwayDifficulty === 'easy' ? 'text-green-600' :
                  airwayDifficulty === 'potentially_difficult' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {airwayDifficulty.replace('_', ' ')}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm text-gray-500">Cardiac Risk (RCRI)</h4>
                <p className="text-xl font-bold">{rcriResult.score} - {rcriResult.risk.split(' ')[0]}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm text-gray-500">VTE Risk (Caprini)</h4>
                <p className="text-xl font-bold">{capriniResult.capriniScore} - {capriniResult.riskCategory}</p>
              </div>
            </div>

            {/* Required Investigations */}
            <div>
              <h4 className="font-medium mb-2">Required Investigations:</h4>
              <ul className="text-sm space-y-1">
                {preoperativeService.getRequiredInvestigations(
                  asaClass,
                  form.watch('surgeryType') || 'intermediate',
                  45, // Would get from patient
                  []
                ).map((inv, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" title={`Mark ${inv} as completed`} />
                    <span>{inv}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Key Recommendations */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium mb-2">Key Recommendations:</h4>
              <ul className="text-sm space-y-1">
                {rcriResult.recommendations.map((rec, idx) => (
                  <li key={idx}>• {rec}</li>
                ))}
                <li>• {capriniResult.prophylaxisRecommendation}</li>
                {airwayDifficulty !== 'easy' && (
                  <li className="text-red-600 font-medium">• Prepare difficult airway equipment</li>
                )}
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Stethoscope className="text-primary-600" />
            Preoperative Assessment
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Comprehensive anaesthetic review for surgical patients</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <Plus size={18} />
          New Assessment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-yellow-600">
            {assessments?.filter(a => a.clearanceStatus === 'pending_review').length || 0}
          </p>
          <p className="text-sm text-gray-500">Pending Review</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-green-600">
            {assessments?.filter(a => a.clearanceStatus === 'cleared').length || 0}
          </p>
          <p className="text-sm text-gray-500">Cleared for Surgery</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-red-600">
            {assessments?.filter(a => a.clearanceStatus === 'deferred').length || 0}
          </p>
          <p className="text-sm text-gray-500">Deferred</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-blue-600">
            {assessments?.filter(a => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const schedDate = new Date(a.scheduledDate);
              schedDate.setHours(0, 0, 0, 0);
              return schedDate.getTime() === today.getTime();
            }).length || 0}
          </p>
          <p className="text-sm text-gray-500">Today's Surgeries</p>
        </div>
      </div>

      {/* Booked Cases Section */}
      {bookedCases && bookedCases.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b px-4 sm:px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar size={20} className="text-teal-600" />
              Booked Surgical Cases Assigned to You
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {bookedCases.length} {bookedCases.length === 1 ? 'case' : 'cases'} require preoperative assessment
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Patient</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Surgery</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Scheduled</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Surgeon</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Type</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookedCases.map((surgery) => {
                  const patient = patientsMap.get(surgery.patientId);
                  const surgeonUser = usersMap.get(surgery.surgeon);
                  
                  return (
                    <tr key={surgery.id} className="border-b hover:bg-teal-50 cursor-pointer transition-colors">
                      <td className="p-4">
                        {patient ? (
                          <div>
                            <p className="font-medium text-gray-900">
                              {patient.firstName} {patient.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{patient.hospitalNumber}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Loading...</p>
                        )}
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-gray-900">{surgery.procedureName}</p>
                          <p className="text-xs text-gray-500 capitalize">{surgery.category}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {format(new Date(surgery.scheduledDate), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {surgeonUser ? `${surgeonUser.firstName} ${surgeonUser.lastName}` : surgery.surgeon}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          surgery.type === 'emergency' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {surgery.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          Awaiting Assessment
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => {
                            setSelectedSurgery(surgery);
                            setShowModal(true);
                          }}
                          className="text-teal-600 hover:text-teal-700 font-medium text-sm flex items-center gap-1"
                        >
                          <Plus size={16} />
                          Assess
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assessments List */}
      {!assessments || assessments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          <Stethoscope className="mx-auto mb-4 text-gray-300" size={48} />
          <p>Click "New Assessment" to begin a preoperative evaluation</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Patient</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Surgery</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Scheduled</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">ASA</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((assessment) => (
                  <tr key={assessment.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-900">{assessment.patientName}</p>
                        <p className="text-sm text-gray-500">{assessment.hospitalNumber}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-gray-900">{assessment.surgeryName}</p>
                        <p className="text-xs text-gray-500 capitalize">{assessment.surgeryType}</p>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {format(new Date(assessment.scheduledDate), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        ASA {assessment.asaClass}{assessment.asaEmergency ? 'E' : ''}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        assessment.clearanceStatus === 'cleared' ? 'bg-green-100 text-green-800' :
                        assessment.clearanceStatus === 'deferred' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {assessment.clearanceStatus === 'pending_review' ? 'Pending' :
                         assessment.clearanceStatus === 'cleared' ? 'Cleared' : 'Deferred'}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => navigate(`/surgery/preop/${assessment.id}`)}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assessment Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold">Preoperative Anaesthetic Assessment</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              {/* Steps Navigation */}
              <div className="border-b overflow-x-auto">
                <div className="flex">
                  {steps.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => setCurrentStep(step.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 ${
                        currentStep === step.id
                          ? 'border-primary-600 text-primary-600 font-medium'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <step.icon size={16} />
                      {step.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-14rem)]">
                {renderStepContent()}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center p-4 border-t bg-gray-50">
                <button
                  onClick={goToPrevStep}
                  disabled={currentStep === 'basic'}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                
                <div className="flex gap-2">
                  {currentStep === 'summary' ? (
                    <button
                      onClick={handleSubmit}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <CheckCircle2 size={16} />
                      Complete Assessment
                    </button>
                  ) : (
                    <button
                      onClick={goToNextStep}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Next
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
